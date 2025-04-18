// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load captions from CSV
const loadCaptionsFromCSV = () => {
  return new Promise((resolve, reject) => {
    const captions = [];
    // Add error handling for file not found
    if (!fs.existsSync('client_captions.csv')) {
      console.warn('CSV file not found, using empty captions array');
      return resolve([]);
    }
    
    fs.createReadStream('client_captions.csv')
      .pipe(csv())
      .on('data', (row) => {
        // Adjust field name based on your CSV structure
        const captionText = row.text || ''; // Use 'text' field from your CSV
        if (captionText) {
          captions.push(captionText);
        }
      })
      .on('end', () => {
        console.log(`Loaded ${captions.length} captions from CSV file`);
        resolve(captions.length > 0 ? captions : ['Default caption example']);
      })
      .on('error', (error) => {
        console.error('Error loading captions:', error);
        // Don't fail completely, just use empty array
        resolve(['Default caption example']);
      });
  });
};

// Add a health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API endpoint to generate captions
app.post('/api/generate-caption', async (req, res) => {
  try {
    const { draftCaption, contentType, contentTheme, additionalNotes, language } = req.body;
    
    // Log the request data (remove in production)
    console.log('Request body:', {
      draftCaption: draftCaption ? 'present' : 'missing',
      contentType: contentType ? 'present' : 'missing',
      contentTheme: contentTheme ? 'present' : 'missing',
      language: language || 'en'
    });

    // Validate required fields
    if (!draftCaption) {
      return res.status(400).json({ error: 'Draft caption is required' });
    }
    
    // Load reference captions with error logging
    let referenceCaptions;
    try {
      referenceCaptions = await loadCaptionsFromCSV();
      console.log('Loaded captions count:', referenceCaptions.length);
    } catch (csvError) {
      console.error('CSV loading error:', csvError);
      referenceCaptions = ['Default caption example'];
    }
    
    // Log OpenAI configuration (remove API key from logs)
    console.log('OpenAI config:', {
      hasApiKey: !!process.env.OPENAI_API_KEY,
      model: "gpt-4"
    });

    // Create context with reference captions (limit to prevent token overflow)
    const captionExamples = referenceCaptions.slice(0, 8).join('\n\n');
    
    // Determine if we should use Japanese or English system prompt
    let systemContent;
    let userContent;
    
    if (language === 'ja') {
      // Japanese system prompt
      systemContent = `
あなたは日本の企業のためのソーシャルメディアキャプションのスペシャリストです。
クライアントの独自のブランドの声と文体を正確に再現し、自然で魅力的な日本語のキャプションを作成します。

以下の例を分析して、クライアントの文体を理解してください：

${captionExamples}

これらの例を分析する際は、以下の特徴に注目してください：

1. 言語構造
   - 文末表現パターン（〜です、〜ます、〜だ、など）
   - 疑問文の構造と修辞的な質問
   - 文の長さと完全な文と文の断片の使用
   - 改行やフォーマットのパターン

2. 敬語レベル
   - 聴衆に対する敬語や丁寧語の使用
   - プロフェッショナルとカジュアルなトーンのバランス

3. 文字使用
   - 漢字、ひらがな、カタカナのバランス
   - 英語の外来語や外国語のフレーズの使用
   - ローマ字の使用とその様式的目的
   - 半角と全角文字の選択

4. 絵文字と記号パターン
   - 絵文字の頻度、配置、種類（文の始め、中間、終わり）
   - 日本特有の絵文字使用（例：🙇‍♀️, 🎐, 🎋）
   - 装飾的な記号（★, ♪, 〜など）とそのパターン
   - 顔文字（^_^）や（＼(^o^)／）などの使用

5. ハッシュタグの慣例
   - ハッシュタグの言語選択（日本語 vs 英語）
   - ハッシュタグの配置（テキストに統合、または最後にグループ化）
   - ブランド固有のハッシュタグとキャンペーンタグ
   - 一般的に使用されるハッシュタグの数

これらの特徴に基づいて、クライアントの文体を正確に再現した新しいキャプションを作成してください。`;

      // Japanese user prompt
      userContent = `
以下のドラフトキャプションをクライアントの文体に合わせて書き直してください：

ドラフト: ${draftCaption}

コンテンツタイプ: ${contentType}
コンテンツテーマ: ${contentTheme}
追加要件: ${additionalNotes}

クライアントの文体を維持しながら、元のメッセージの本質を伝える魅力的なキャプションを作成してください。`;
    } else {
      // English system prompt
      systemContent = `You are a specialized social media caption writer for a brand. 
      You need to rewrite captions to match the brand's voice and style while maintaining the core message.
      
      Here are examples of the brand's caption style:
      
      ${captionExamples}
      
      Analyze these examples to understand the brand's tone, vocabulary, sentence structure, emoji usage, and overall style.
      Create a caption that maintains this style but for new content.`;

      // English user prompt
      userContent = `Please rewrite the following draft caption to match our brand's voice:
      
      Draft: ${draftCaption}
      
      Content Type: ${contentType}
      Content Theme: ${contentTheme}
      Additional Requirements: ${additionalNotes}
      
      Keep hashtags if present and maintain our brand's style.`;
    }
    
    // Create OpenAI request
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: userContent
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
    });
    
    const generatedCaption = completion.choices[0].message.content;
    res.json({ caption: generatedCaption });
    
  } catch (error) {
    // Enhanced error logging
    console.error('Detailed error:', {
      message: error.message,
      type: error.constructor.name,
      stack: error.stack,
      status: error.status || 500
    });

    // Send a more informative error response
    res.status(500).json({ 
      error: 'Failed to generate caption',
      details: error.message,
      type: error.constructor.name
    });
  }
});

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the caption page
app.get('/caption', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'caption.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
