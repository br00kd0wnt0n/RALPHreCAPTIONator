const { OpenAI } = require('openai');
const config = require('../config/config');
const { loadKoreanAirTweets, analyzeTweetStyle } = require('../utils/tweetAnalyzer');

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

const createSystemPrompt = (tweetExamples, styleAnalysis) => {
  return `You are Ralph's Re-Caption-ator (tm), a specialized AI tool that rewrites social media captions to match Korean Air Japan's unique voice and style.

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
};

const createUserPrompt = (originalCaption, contentType, additionalNotes) => {
  return `Please rewrite this caption in Korean Air Japan's style:

ORIGINAL CAPTION: "${originalCaption}"

CONTENT TYPE: ${contentType}
ADDITIONAL CONTEXT: ${additionalNotes}

Please provide:
1. The rewritten caption in Korean Air Japan's style
2. Brief explanation of key changes made (what phrases/words were borrowed, style adjustments)`;
};

const parseResponse = (response) => {
  const lines = response.split('\n');
  let rewrittenCaption = '';
  let explanation = '';
  
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

  rewrittenCaption = rewrittenCaption.replace(/^1\.\s*/, '').trim();
  
  return { rewrittenCaption, explanation };
};

const recaption = async (req, res) => {
  try {
    console.log('--- Incoming /api/recaption request ---');
    console.log('Request body:', req.body);
    const { originalCaption, contentType = 'tweet', additionalNotes = '' } = req.body;
    
    if (!originalCaption) {
      console.warn('No originalCaption provided');
      return res.status(400).json({ error: 'Original caption is required for Ralph to work his magic!' });
    }

    const koreanAirTweets = await loadKoreanAirTweets();
    
    if (koreanAirTweets.length === 0) {
      console.error('No Korean Air Japan tweets found.');
      throw new Error('No Korean Air Japan tweets found. Ralph needs his reference material!');
    }

    const styleAnalysis = analyzeTweetStyle(koreanAirTweets);
    const relevantTweets = koreanAirTweets
      .sort(() => 0.5 - Math.random())
      .slice(0, 12);
    const tweetExamples = relevantTweets.map((tweet, index) => 
      `Example ${index + 1}: ${tweet}`
    ).join('\n\n');

    // Log prompt creation
    console.log('Creating prompts for OpenAI...');
    const systemPrompt = createSystemPrompt(tweetExamples, styleAnalysis);
    const userPrompt = createUserPrompt(originalCaption, contentType, additionalNotes);
    console.log('System prompt:', systemPrompt);
    console.log('User prompt:', userPrompt);

    // Call OpenAI API
    console.log('Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: config.openai.temperature,
      max_tokens: config.openai.maxTokens,
    });
    console.log('OpenAI API response:', completion);

    const { rewrittenCaption, explanation } = parseResponse(completion.choices[0].message.content);
    console.log('Parsed rewrittenCaption:', rewrittenCaption);
    console.log('Parsed explanation:', explanation);
    
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
};

module.exports = {
  recaption
}; 