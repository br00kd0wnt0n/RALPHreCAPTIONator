// server.js - Ralph's Re-Caption-ator (tm)
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { OpenAI } = require('openai');
const config = require('./config/config');
const apiRoutes = require('./routes/api');
require('dotenv').config();

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load Korean Air Japan tweets from CSV
const loadKoreanAirTweets = () => {
  return new Promise((resolve, reject) => {
    const tweets = [];
    fs.createReadStream('korean_air_tweets.csv') // You'll rename your CSV to this
      .pipe(csv())
      .on('data', (row) => {
        const tweetText = row.text || '';
        if (tweetText && tweetText.trim().length > 0) {
          tweets.push(tweetText.trim());
        }
      })
      .on('end', () => {
        console.log(`🛫 Loaded ${tweets.length} Korean Air Japan tweets for Ralph's Re-Caption-ator`);
        resolve(tweets);
      })
      .on('error', (error) => {
        console.error('Error loading Korean Air tweets:', error);
        reject(error);
      });
  });
};

// Analyze tweet patterns to extract key phrases and style elements
const analyzeTweetStyle = (tweets) => {
  const analysis = {
    commonPhrases: {},
    hashtagPatterns: [],
    emojiUsage: [],
    mentionPatterns: [],
    avgLength: 0,
    totalLength: 0
  };

  tweets.forEach(tweet => {
    analysis.totalLength += tweet.length;
    
    // Extract hashtags
    const hashtags = tweet.match(/#[\w\u00C0-\u017F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g) || [];
    analysis.hashtagPatterns.push(...hashtags);
    
    // Extract mentions
    const mentions = tweet.match(/@[\w]+/g) || [];
    analysis.mentionPatterns.push(...mentions);
    
    // Extract emojis (basic)
    const emojis = tweet.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || [];
    analysis.emojiUsage.push(...emojis);
  });

  analysis.avgLength = analysis.totalLength / tweets.length;
  return analysis;
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', tool: "Ralph's Re-Caption-ator (tm)" });
});

// Main re-captioning API endpoint
app.post('/api/recaption', async (req, res) => {
  try {
    const { originalCaption, contentType = 'tweet', additionalNotes = '' } = req.body;
    
    if (!originalCaption) {
      return res.status(400).json({ error: 'Original caption is required for Ralph to work his magic!' });
    }

    // Load Korean Air Japan tweets
    const koreanAirTweets = await loadKoreanAirTweets();
    
    if (koreanAirTweets.length === 0) {
      throw new Error('No Korean Air Japan tweets found. Ralph needs his reference material!');
    }

    // Analyze style patterns
    const styleAnalysis = analyzeTweetStyle(koreanAirTweets);
    
    // Select relevant tweets (semantic similarity would be better, but for now we'll use random sampling)
    const relevantTweets = koreanAirTweets
      .sort(() => 0.5 - Math.random())
      .slice(0, 12); // Use 12 representative tweets

    const tweetExamples = relevantTweets.map((tweet, index) => 
      `Example ${index + 1}: ${tweet}`
    ).join('\n\n');

    // Create specialized prompt for Korean Air Japan style
    const systemPrompt = `You are Ralph's Re-Caption-ator (tm), a specialized AI tool that rewrites social media captions to match Korean Air Japan's unique voice and style.

KOREAN AIR JAPAN VOICE ANALYSIS:
Based on the provided examples, Korean Air Japan's social media style includes:
- Professional yet warm tone
- Mix of Japanese and English elements
- Aviation and travel-focused messaging
- Customer service excellence emphasis
- Cultural sensitivity and local market awareness

REFERENCE TWEETS FROM KOREAN AIR JAPAN:
${tweetExamples}

YOUR TASK:
1. Analyze the reference tweets to understand Korean Air Japan's distinctive voice, tone, vocabulary, and style patterns
2. Rewrite the provided caption to match this exact style
3. Incorporate specific words, phrases, and structural elements from the reference tweets
4. Maintain the core message while transforming it into Korean Air Japan's voice
5. Keep the length appropriate for the content type
6. Preserve any important information like dates, locations, or key details

STYLE ELEMENTS TO MAINTAIN:
- Sentence structure patterns
- Vocabulary choices and airline-specific terminology  
- Emoji usage patterns (${styleAnalysis.emojiUsage.slice(0, 5).join(' ')})
- Hashtag style (common tags: ${[...new Set(styleAnalysis.hashtagPatterns)].slice(0, 5).join(' ')})
- Professional tone with customer-focused messaging
- Cultural nuances for Japanese market

Remember: You're not translating - you're rewriting in Korean Air Japan's established voice.`;

    const userPrompt = `Please rewrite this caption in Korean Air Japan's style:

ORIGINAL CAPTION: "${originalCaption}"

CONTENT TYPE: ${contentType}
ADDITIONAL CONTEXT: ${additionalNotes}

Please provide:
1. The rewritten caption in Korean Air Japan's style
2. Brief explanation of key changes made (what phrases/words were borrowed, style adjustments)`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user", 
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0].message.content;
    
    // Try to parse the response to separate caption from explanation
    const lines = response.split('\n');
    let rewrittenCaption = '';
    let explanation = '';
    
    // Simple parsing - look for numbered sections or clear breaks
    const captionEnd = lines.findIndex(line => 
      line.toLowerCase().includes('explanation') || 
      line.toLowerCase().includes('changes') ||
      line.includes('2.') ||
      line.startsWith('**')
    );
    
    if (captionEnd > -1) {
      rewrittenCaption = lines.slice(0, captionEnd).join('\n').trim();
      explanation = lines.slice(captionEnd).join('\n').trim();
    } else {
      rewrittenCaption = response;
      explanation = 'Ralph worked his magic, but kept the details to himself this time.';
    }

    // Clean up the caption (remove "1." if present)
    rewrittenCaption = rewrittenCaption.replace(/^1\.\s*/, '').trim();
    
    res.json({
      originalCaption,
      rewrittenCaption,
      explanation,
      styleAnalysis: {
        avgLength: Math.round(styleAnalysis.avgLength),
        commonEmojis: [...new Set(styleAnalysis.emojiUsage)].slice(0, 5),
        commonHashtags: [...new Set(styleAnalysis.hashtagPatterns)].slice(0, 5),
      },
      ralphSays: "Caption successfully re-captioned! ✈️"
    });

  } catch (error) {
    console.error('Ralph encountered an error:', error);
    res.status(500).json({ 
      error: 'Ralph hit some turbulence! Please try again.',
      details: error.message 
    });
  }
});

// API Routes
app.use('/api', apiRoutes);

// Serve the main interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Ralph hit some turbulence! Please try again.',
    details: config.server.env === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(config.server.port, () => {
  console.log(`🛫 Ralph's Re-Caption-ator (tm) is ready for takeoff on port ${config.server.port}!`);
  console.log(`🌐 Visit http://localhost:${config.server.port} to start re-captioning`);
});
