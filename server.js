// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { OpenAI } = require('openai');
require('dotenv').config();

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

// Serve the Japanese caption form
app.get('/japanese', (req, res) => {
  // Send the Japanese form as a response directly
  const japaneseForm = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Japanese Caption Generator</title>
    <style>
        body {
            font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', Meiryo, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        
        .container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        h1 {
            color: #2c3e50;
            margin-top: 0;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        textarea, input, select {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 15px;
            font-family: inherit;
        }
        
        textarea {
            min-height: 120px;
            resize: vertical;
        }
        
        button {
            background-color: #3498db;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: background-color 0.2s;
        }
        
        button:hover {
            background-color: #2980b9;
        }
        
        #loading {
            display: none;
            text-align: center;
            margin: 20px 0;
        }
        
        .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-left-color: #3498db;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        #result {
            margin-top: 30px;
            padding: 20px;
            border-radius: 4px;
            background-color: #f1f9ff;
            border-left: 4px solid #3498db;
            display: none;
        }
        
        #result h2 {
            margin-top: 0;
            color: #2c3e50;
        }
        
        #caption-text {
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>日本語キャプションジェネレーター</h1>
        
        <form id="caption-form">
            <div class="form-group">
                <label for="draft-caption">ドラフトキャプションまたは投稿の説明:</label>
                <textarea id="draft-caption" name="draft-caption" placeholder="投稿したい内容のドラフトキャプションや説明を入力してください..."></textarea>
            </div>
            
            <div class="form-group">
                <label for="content-type">コンテンツタイプ:</label>
                <select id="content-type" name="content-type">
                    <option value="image">画像</option>
                    <option value="video">動画</option>
                    <option value="carousel">カルーセル</option>
                    <option value="story">ストーリー</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="content-theme">コンテンツテーマ:</label>
                <select id="content-theme" name="content-theme">
                    <option value="product">製品</option>
                    <option value="lifestyle">ライフスタイル</option>
                    <option value="behind-the-scenes">舞台裏</option>
                    <option value="user-generated">ユーザー生成</option>
                    <option value="promotion">プロモーション</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="additional-notes">追加メモ (キーワード、トーンなど):</label>
                <textarea id="additional-notes" name="additional-notes" placeholder="特定の要件、含めるキーワード、またはトーンの好みを追加してください..."></textarea>
            </div>
            
            <button type="submit">キャプションを生成</button>
        </form>
        
        <div id="loading">
            <div class="spinner"></div>
            <p>キャプションを生成中...</p>
        </div>
        
        <div id="result">
            <h2>生成されたキャプション</h2>
            <div id="caption-text"></div>
        </div>
    </div>

    <script>
        document.getElementById('caption-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Show loading spinner
            document.getElementById('loading').style.display = 'block';
            document.getElementById('result').style.display = 'none';
            
            // Get form data
            const draftCaption = document.getElementById('draft-caption').value;
            const contentType = document.getElementById('content-type').value;
            const contentTheme = document.getElementById('content-theme').value;
            const additionalNotes = document.getElementById('additional-notes').value;
            
            try {
                // Submit to backend API
                const response = await fetch('/api/japanese-caption', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        draftCaption,
                        contentType,
                        contentTheme,
                        additionalNotes
                    }),
                });
                
                const data = await response.json();
                
                // Display result
                document.getElementById('caption-text').textContent = data.caption;
                document.getElementById('result').style.display = 'block';
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('caption-text').textContent = '申し訳ありませんが、キャプションの生成中にエラーが発生しました。もう一度お試しください。';
                document.getElementById('result').style.display = 'block';
            } finally {
                // Hide loading spinner
                document.getElementById('loading').style.display = 'none';
            }
        });
    </script>
</body>
</html>`;

  res.send(japaneseForm);
});

// Log when server starts
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
