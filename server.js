// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { OpenAI } = require('openai');
require('dotenv').config();

// The path should be './scripts/japanese_routes' if files are in a scripts folder
// But for now, let's make a self-contained solution without extra imports

const app = express();
// Important: Use Railway's PORT environment variable or fallback to 3000
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize OpenAI with API key from environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load captions from CSV
const loadCaptionsFromCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const captions = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Adjust field name based on your CSV structure
        const captionText = row.caption || row.text || row.content || '';
        if (captionText) {
          captions.push(captionText);
        }
      })
      .on('end', () => {
        console.log(`Loaded ${captions.length} captions from CSV file`);
        resolve(captions);
      })
      .on('error', (error) => {
        console.error('Error loading captions:', error);
        reject(error);
      });
  });
};

// Log feedback
const logFeedback = (feedbackData) => {
  const timestamp = new Date().toISOString();
  const feedbackEntry = {
    timestamp,
    ...feedbackData
  };
  
  // Create the feedback directory if it doesn't exist
  if (!fs.existsSync('./feedback')) {
    try {
      fs.mkdirSync('./feedback');
    } catch (err) {
      console.error('Error creating feedback directory:', err);
      return;
    }
  }
  
  // Append to the feedback log file
  const feedbackString = JSON.stringify(feedbackEntry) + '\n';
  fs.appendFile('./feedback/caption_feedback.jsonl', feedbackString, (err) => {
    if (err) {
      console.error('Error saving feedback:', err);
    } else {
      console.log('Feedback saved successfully');
    }
  });
};

// Add a health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API endpoint to generate standard captions
app.post('/api/generate-caption', async (req, res) => {
  try {
    const { draftCaption, contentType, contentTheme, additionalNotes } = req.body;
    
    // Load reference captions from CSV
    const referenceCaptions = await loadCaptionsFromCSV('client_captions.csv');
    
    // Create context with reference captions (limit to prevent token overflow)
    const captionExamples = referenceCaptions.slice(0, 10).join('\n\n');
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // or use "gpt-3.5-turbo" for a more economical option
      messages: [
        {
          role: "system",
          content: `You are a specialized social media caption writer for a brand. 
          You need to rewrite captions to match the brand's voice and style while maintaining the core message.
          
          Here are examples of the brand's caption style:
          
          ${captionExamples}
          
          Analyze these examples to understand the brand's tone, vocabulary, sentence structure, emoji usage, and overall style.
          Create a caption that maintains this style but for new content.`
        },
        {
          role: "user",
          content: `Please rewrite the following draft caption to match our brand's voice:
          
          Draft: ${draftCaption}
          
          Content Type: ${contentType}
          Content Theme: ${contentTheme}
          Additional Requirements: ${additionalNotes}
          
          Keep hashtags if present and maintain our brand's style.`
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    
    const generatedCaption = completion.choices[0].message.content;
    
    res.json({ caption: generatedCaption });
  } catch (error) {
    console.error('Error generating caption:', error);
    res.status(500).json({ error: 'Failed to generate caption' });
  }
});

// API endpoint to generate Japanese captions
app.post('/api/japanese-caption', async (req, res) => {
  try {
    const { draftCaption, contentType, contentTheme, additionalNotes } = req.body;
    
    // Validate input
    if (!draftCaption) {
      return res.status(400).json({ 
        error: 'Draft caption is required' 
      });
    }
    
    // Load reference captions from CSV
    const referenceCaptions = await loadCaptionsFromCSV('client_captions.csv');
    
    if (referenceCaptions.length === 0) {
      throw new Error('No example captions found. Please check your CSV file.');
    }
    
    // Select a subset of examples to prevent token overflow (max 6)
    const selectedExamples = referenceCaptions.slice(0, 6);
    const formattedExamples = selectedExamples.map((caption, index) => 
      `例 ${index + 1}:\n${caption}`
    ).join('\n\n');
    
    // Create system content with Japanese instructions
    const systemContent = `
あなたは日本の企業のためのソーシャルメディアキャプションのスペシャリストです。
クライアントの独自のブランドの声と文体を正確に再現し、自然で魅力的な日本語のキャプションを作成します。

以下の例を分析して、クライアントの文体を理解してください：

${formattedExamples}

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

    // User prompt with the specific request
    const userContent = `
以下のドラフトキャプションをクライアントの文体に合わせて書き直してください：

ドラフト: ${draftCaption}

コンテンツタイプ: ${contentType}
コンテンツテーマ: ${contentTheme}
追加要件: ${additionalNotes}

クライアントの文体を維持しながら、元のメッセージの本質を伝える魅力的なキャプションを作成してください。`;
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // or "gpt-4-turbo" if available
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
      temperature: 0.7,
      max_tokens: 800,
    });
    
    // Extract and return the generated caption
    const generatedCaption = completion.choices[0].message.content.trim();
    
    res.json({ 
      caption: generatedCaption,
      original: draftCaption,
      contentType,
      contentTheme
    });
  } catch (error) {
    console.error('Error generating Japanese caption:', error);
    res.status(500).json({ 
      error: 'Failed to generate Japanese caption',
      message: error.message 
    });
  }
});

// Route for submitting feedback
app.post('/api/caption-feedback', (req, res) => {
  try {
    const { originalDraft, generatedCaption, feedback, rating, language } = req.body;
    
    // Validate input
    if (!originalDraft || !generatedCaption || !feedback) {
      return res.status(400).json({ 
        error: 'Original draft, generated caption, and feedback are required' 
      });
    }
    
    // Log the feedback
    logFeedback({
      originalDraft,
      generatedCaption,
      feedback,
      rating: rating || '3',
      language: language || 'en'
    });
    
    res.json({ 
      success: true,
      message: 'Feedback recorded successfully'
    });
  } catch (error) {
    console.error('Error in feedback route:', error);
    res.status(500).json({ 
      error: 'Failed to record feedback',
      message: error.message
    });
  }
});

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Log when server starts
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
