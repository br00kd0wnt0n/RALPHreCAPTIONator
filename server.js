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
    fs.createReadStream('client_captions.csv')
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

// Add a health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API endpoint to generate captions
app.post('/api/generate-caption', async (req, res) => {
  try {
    const { draftCaption, contentType, contentTheme, additionalNotes } = req.body;
    
    // Load reference captions from CSV
    const referenceCaptions = await loadCaptionsFromCSV();
    
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
      return res.status(400).json({ error: 'Draft caption is required' });
    }
    
    // Load reference captions from CSV
    const referenceCaptions = await loadCaptionsFromCSV();
    
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

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create a very simple Japanese form
app.get('/japanese', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Japanese Caption Generator</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        textarea { width: 100%; height: 150px; margin-bottom: 10px; }
        button { padding: 10px 20px; background: #0066ff; color: white; border: none; cursor: pointer; }
        #result { margin-top: 20px; padding: 10px; background: #f0f0f0; white-space: pre-wrap; }
    </style>
</head>
<body>
    <h1>Japanese Caption Generator</h1>
    <form id="captionForm">
        <div>
            <label for="draft">ドラフトキャプション:</label>
            <textarea id="draft" required></textarea>
        </div>
        <div>
            <label for="type">コンテンツタイプ:</label>
            <select id="type">
                <option value="image">画像</option>
                <option value="video">動画</option>
            </select>
        </div>
        <div>
            <label for="theme">テーマ:</label>
            <select id="theme">
                <option value="product">製品</option>
                <option value="lifestyle">ライフスタイル</option>
            </select>
        </div>
        <div>
            <label for="notes">追加メモ:</label>
            <textarea id="notes"></textarea>
        </div>
        <button type="submit">生成</button>
    </form>
    <div id="loading" style="display:none;">処理中...</div>
    <div id="result" style="display:none;"></div>

    <script>
        document.getElementById('captionForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            document.getElementById('loading').style.display = 'block';
            document.getElementById('result').style.display = 'none';
            
            const draft = document.getElementById('draft').value;
            const type = document.getElementById('type').value;
            const theme = document.getElementById('theme').value;
            const notes = document.getElementById('notes').value;
            
            try {
                const response = await fetch('/api/japanese-caption', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        draftCaption: draft,
                        contentType: type,
                        contentTheme: theme,
                        additionalNotes: notes
                    }),
                });
                
                const data = await response.json();
                
                document.getElementById('result').textContent = data.caption;
                document.getElementById('result').style.display = 'block';
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('result').textContent = 'エラーが発生しました。もう一度お試しください。';
                document.getElementById('result').style.display = 'block';
            } finally {
                document.getElementById('loading').style.display = 'none';
            }
        });
    </script>
</body>
</html>
  `);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
