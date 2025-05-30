const fs = require('fs');
const path = require('path');

const promptsFile = path.join(__dirname, '../../data/prompts.json');

// Default prompts for Ralph's Re-Caption-ator
const defaultPrompts = {
  version: 1,
  lastModified: new Date().toISOString(),
  systemPrompt: `You are Ralph's Re-Caption-ator, a specialized AI tool that rewrites social media captions to match Korean Air Japan's unique voice and style.

KOREAN AIR JAPAN VOICE ANALYSIS:
Based on the provided examples, Korean Air Japan's social media style includes:
- Professional yet warm tone
- Mix of Japanese and English elements
- Aviation and travel-focused messaging
- Customer service excellence emphasis
- Cultural sensitivity and local market awareness

REFERENCE TWEETS FROM KOREAN AIR JAPAN:
{tweetExamples}

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
- Emoji usage patterns ({emojiPatterns})
- Hashtag style (common tags: {hashtagPatterns})
- Professional tone with customer-focused messaging
- Cultural nuances for Japanese market

Remember: You're not translating - you're rewriting in Korean Air Japan's established voice.`,

  userPrompt: `Please rewrite this caption in Korean Air Japan's style:

ORIGINAL CAPTION: "{originalCaption}"

CONTENT TYPE: {contentType}
ADDITIONAL CONTEXT: {additionalNotes}

Please provide:
1. The rewritten caption in Korean Air Japan's style
2. Brief explanation of key changes made (what phrases/words were borrowed, style adjustments)`
};

// Load prompts from file if exists, else use defaults
let currentPrompts;
let version = 1;
let lastModified = new Date().toISOString();
try {
  if (fs.existsSync(promptsFile)) {
    currentPrompts = JSON.parse(fs.readFileSync(promptsFile, 'utf8'));
    version = currentPrompts.version || 1;
    lastModified = currentPrompts.lastModified || new Date().toISOString();
  } else {
    currentPrompts = { ...defaultPrompts };
    version = 1;
    lastModified = new Date().toISOString();
  }
} catch (e) {
  currentPrompts = { ...defaultPrompts };
  version = 1;
  lastModified = new Date().toISOString();
}

module.exports = {
  getPrompts: () => ({ ...currentPrompts, version, lastModified }),
  getDefaultPrompts: () => ({ ...defaultPrompts }),
  updatePrompts: (newPrompts) => {
    version = (currentPrompts.version || 1) + 1;
    lastModified = new Date().toISOString();
    currentPrompts = { ...newPrompts, version, lastModified };
    try {
      fs.mkdirSync(path.dirname(promptsFile), { recursive: true });
      fs.writeFileSync(promptsFile, JSON.stringify(currentPrompts, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save prompts to file:', e);
    }
    return { ...currentPrompts };
  }
}; 