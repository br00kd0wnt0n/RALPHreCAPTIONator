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
    const { draftCaption, contentType, contentTheme, additionalNotes, language } = req.body;
    
    // Load reference captions from CSV
    const referenceCaptions = await loadCaptionsFromCSV();
    
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
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // or use "gpt-3.5-turbo" for a more economical option
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
    console.error('Error generating caption:', error);
    res.status(500).json({ error: 'Failed to generate caption' });
  }
});

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve a multilingual form with language toggle
app.get('/caption', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>AI Caption Generator</title>
    <style>
        body {
            font-family: 'Segoe UI', 'Hiragino Sans', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        
        .container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        h1 {
            margin-top: 0;
            color: #2c3e50;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
        }
        
        textarea, select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 15px;
            font-family: inherit;
            box-sizing: border-box;
        }
        
        textarea {
            min-height: 120px;
            resize: vertical;
        }
        
        button {
            background-color: #3498db;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
        }
        
        button:hover {
            background-color: #2980b9;
        }
        
        #loading {
            display: none;
            margin: 20px 0;
            text-align: center;
        }
        
        #result {
            margin-top: 20px;
            padding: 15px;
            background-color: #f5f9ff;
            border-left: 4px solid #3498db;
            display: none;
            white-space: pre-wrap;
        }
        
        .language-toggle {
            text-align: right;
            margin-bottom: 20px;
        }
        
        .language-toggle a {
            padding: 5px 10px;
            margin-left: 10px;
            text-decoration: none;
            color: #3498db;
        }
        
        .language-toggle a.active {
            font-weight: bold;
            border-bottom: 2px solid #3498db;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="language-toggle">
            <a href="#" id="en-toggle" class="active">English</a>
            <a href="#" id="ja-toggle">日本語</a>
        </div>
        
        <h1 id="title">AI Caption Generator</h1>
        
        <form id="captionForm">
            <input type="hidden" id="language" value="en">
            
            <div class="form-group">
                <label for="draft" id="label-draft">Draft Caption:</label>
                <textarea id="draft" required></textarea>
            </div>
            
            <div class="form-group">
                <label for="type" id="label-type">Content Type:</label>
                <select id="type">
                    <option value="image" id="option-image">Image</option>
                    <option value="video" id="option-video">Video</option>
                    <option value="carousel" id="option-carousel">Carousel</option>
                    <option value="story" id="option-story">Story</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="theme" id="label-theme">Content Theme:</label>
                <select id="theme">
                    <option value="product" id="option-product">Product</option>
                    <option value="lifestyle" id="option-lifestyle">Lifestyle</option>
                    <option value="behind-the-scenes" id="option-bts">Behind the Scenes</option>
                    <option value="user-generated" id="option-ugc">User Generated</option>
                    <option value="promotion" id="option-promo">Promotion</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="notes" id="label-notes">Additional Notes:</label>
                <textarea id="notes"></textarea>
            </div>
            
            <button type="submit" id="submit-button">Generate Caption</button>
        </form>
        
        <div id="loading">
            <p id="loading-text">Generating caption...</p>
        </div>
        
        <div id="result"></div>
    </div>

    <script>
        // Language toggle functionality
        const enToggle = document.getElementById('en-toggle');
        const jaToggle = document.getElementById('ja-toggle');
        const languageField = document.getElementById('language');
        
        // Text translations
        const translations = {
            en: {
                title: 'AI Caption Generator',
                labelDraft: 'Draft Caption:',
                labelType: 'Content Type:',
                labelTheme: 'Content Theme:',
                labelNotes: 'Additional Notes:',
                submitButton: 'Generate Caption',
                loadingText: 'Generating caption...',
                draftPlaceholder: 'Enter your draft caption or description...',
                notesPlaceholder: 'Add any specific requirements, keywords, or tone preferences...',
                optionImage: 'Image',
                optionVideo: 'Video',
                optionCarousel: 'Carousel',
                optionStory: 'Story',
                optionProduct: 'Product',
                optionLifestyle: 'Lifestyle',
                optionBts: 'Behind the Scenes',
                optionUgc: 'User Generated',
                optionPromo: 'Promotion',
                errorMessage: 'An error occurred. Please try again.'
            },
            ja: {
                title: '日本語キャプションジェネレーター',
                labelDraft: 'ドラフトキャプション:',
                labelType: 'コンテンツタイプ:',
                labelTheme: 'コンテンツテーマ:',
                labelNotes: '追加メモ:',
                submitButton: 'キャプションを生成',
                loadingText: 'キャプションを生成中...',
                draftPlaceholder: '投稿したい内容のドラフトキャプションや説明を入力してください...',
                notesPlaceholder: '特定の要件、キーワード、またはトーンの好みを追加してください...',
                optionImage: '画像',
                optionVideo: '動画',
                optionCarousel: 'カルーセル',
                optionStory: 'ストーリー',
                optionProduct: '製品',
                optionLifestyle: 'ライフスタイル',
                optionBts: '舞台裏',
                optionUgc: 'ユーザー生成',
                optionPromo: 'プロモーション',
                errorMessage: 'エラーが発生しました。もう一度お試しください。'
            }
        };
        
        // Change language function
        function changeLanguage(lang) {
            // Update language field
            languageField.value = lang;
            
            // Update active toggle
            if (lang === 'en') {
                enToggle.classList.add('active');
                jaToggle.classList.remove('active');
            } else {
                enToggle.classList.remove('active');
                jaToggle.classList.add('active');
            }
            
            // Update text elements
            const t = translations[lang];
            document.getElementById('title').textContent = t.title;
            document.getElementById('label-draft').textContent = t.labelDraft;
            document.getElementById('label-type').textContent = t.labelType;
            document.getElementById('label-theme').textContent = t.labelTheme;
            document.getElementById('label-notes').textContent = t.labelNotes;
            document.getElementById('submit-button').textContent = t.submitButton;
            document.getElementById('loading-text').textContent = t.loadingText;
            
            // Update placeholders
            document.getElementById('draft').placeholder = t.draftPlaceholder;
            document.getElementById('notes').placeholder = t.notesPlaceholder;
            
            // Update options
            document.getElementById('option-image').textContent = t.optionImage;
            document.getElementById('option-video').textContent = t.optionVideo;
            document.getElementById('option-carousel').textContent = t.optionCarousel;
            document.getElementById('option-story').textContent = t.optionStory;
            document.getElementById('option-product').textContent = t.optionProduct;
            document.getElementById('option-lifestyle').textContent = t.optionLifestyle;
            document.getElementById('option-bts').textContent = t.optionBts;
            document.getElementById('option-ugc').textContent = t.optionUgc;
            document.getElementById('option-promo').textContent = t.optionPromo;
        }
        
        // Add event listeners to language toggles
        enToggle.addEventListener('click', function(e) {
            e.preventDefault();
            changeLanguage('en');
        });
        
        jaToggle.addEventListener('click', function(e) {
            e.preventDefault();
            changeLanguage('ja');
        });
        
        // Form submission handler
        document.getElementById('captionForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Show loading indicator
            document.getElementById('loading').style.display = 'block';
            document.getElementById('result').style.display = 'none';
            
            // Get form data
            const draftCaption = document.getElementById('draft').value;
            const contentType = document.getElementById('type').value;
            const contentTheme = document.getElementById('theme').value;
            const additionalNotes = document.getElementById('notes').value;
            const language = document.getElementById('language').value;
            
            try {
                // Send request to API
                const response = await fetch('/api/generate-caption', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        draftCaption,
                        contentType,
                        contentTheme,
                        additionalNotes,
                        language
                    }),
                });
                
                const data = await response.json();
                
                // Display result
                document.getElementById('result').textContent = data.caption;
                document.getElementById('result').style.display = 'block';
            } catch (error) {
                console.error('Error:', error);
                const errorMessage = language === 'ja' ? 
                    translations.ja.errorMessage : 
                    translations.en.errorMessage;
                document.getElementById('result').textContent = errorMessage;
                document.getElementById('result').style.display = 'block';
            } finally {
                // Hide loading indicator
                document.getElementById('loading').style.display = 'none';
            }
        });
        
        // Initialize with English
        changeLanguage('en');
    </script>
</body>
</html>
  `);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
