const fs = require('fs');
const csv = require('csv-parser');

// Load Korean Air Japan tweets from CSV
const loadKoreanAirTweets = () => {
  return new Promise((resolve, reject) => {
    const tweets = [];
    fs.createReadStream('korean_air_tweets.csv')
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
    
    // Extract emojis
    const emojis = tweet.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || [];
    analysis.emojiUsage.push(...emojis);
  });

  analysis.avgLength = analysis.totalLength / tweets.length;
  return analysis;
};

module.exports = {
  loadKoreanAirTweets,
  analyzeTweetStyle
}; 