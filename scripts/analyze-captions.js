// analyze-captions.js
const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// This script analyzes the CSV file with captions to extract patterns and insights
// It helps in understanding the client's style better

const analyzeCaptions = async () => {
  const captions = [];
  const captionStats = {
    totalCaptions: 0,
    averageLength: 0,
    hashtagUsage: 0,
    emojiUsage: 0,
    commonWords: {},
    commonPhrases: {},
    callToActions: 0
  };
  
  // Regular expressions
  const hashtagRegex = /#[\w\u00C0-\u017F]+/g;
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const ctaRegex = /\b(shop|click|link|bio|visit|check|follow|order|buy|discover|explore|learn)\b/i;
  
  console.log('Starting caption analysis...');
  
  return new Promise((resolve, reject) => {
    fs.createReadStream('client_captions.csv')
      .pipe(csv())
      .on('data', (row) => {
        // Get caption text from appropriate field
        const captionText = row.caption || row.text || row.description || '';
        if (!captionText) return;
        
        captions.push(captionText);
        captionStats.totalCaptions++;
        
        // Length analysis
        captionStats.averageLength += captionText.length;
        
        // Hashtag analysis
        const hashtags = captionText.match(hashtagRegex) || [];
        captionStats.hashtagUsage += hashtags.length;
        
        // Emoji analysis
        const emojis = captionText.match(emojiRegex) || [];
        captionStats.emojiUsage += emojis.length;
        
        // Word frequency
        const words = captionText.toLowerCase()
          .replace(hashtagRegex, '')
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 3);
          
        words.forEach(word => {
          captionStats.commonWords[word] = (captionStats.commonWords[word] || 0) + 1;
        });
        
        // Call to action analysis
        if (ctaRegex.test(captionText)) {
          captionStats.callToActions++;
        }
        
        // Phrase analysis (2-3 word phrases)
        for (let i = 0; i < words.length - 1; i++) {
          const twoWordPhrase = `${words[i]} ${words[i+1]}`;
          captionStats.commonPhrases[twoWordPhrase] = (captionStats.commonPhrases[twoWordPhrase] || 0) + 1;
          
          if (i < words.length - 2) {
            const threeWordPhrase = `${words[i]} ${words[i+1]} ${words[i+2]}`;
            captionStats.commonPhrases[threeWordPhrase] = (captionStats.commonPhrases[threeWordPhrase] || 0) + 1;
          }
        }
      })
      .on('end', () => {
        // Calculate final stats
        if (captionStats.totalCaptions > 0) {
          captionStats.averageLength /= captionStats.totalCaptions;
          captionStats.hashtagUsage /= captionStats.totalCaptions;
          captionStats.emojiUsage /= captionStats.totalCaptions;
          captionStats.callToActions = (captionStats.callToActions / captionStats.totalCaptions) * 100;
          
          // Sort word and phrase frequency
          const sortedWords = Object.entries(captionStats.commonWords)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);
            
          const sortedPhrases = Object.entries(captionStats.commonPhrases)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);
          
          // Create results
          const results = {
            totalCaptions: captionStats.totalCaptions,
            averageLength: Math.round(captionStats.averageLength),
            avgHashtagsPerPost: captionStats.hashtagUsage.toFixed(2),
            avgEmojisPerPost: captionStats.emojiUsage.toFixed(2),
            percentWithCTA: captionStats.callToActions.toFixed(2) + '%',
            topWords: sortedWords.map(([word, count]) => `${word} (${count})`).join(', '),
            topPhrases: sortedPhrases.map(([phrase, count]) => `${phrase} (${count})`).join(', ')
          };
          
          // Write results to CSV
          const csvWriter = createCsvWriter({
            path: 'caption_analysis.csv',
            header: [
              {id: 'metric', title: 'Metric'},
              {id: 'value', title: 'Value'}
            ]
          });
          
          const records = Object.entries(results).map(([metric, value]) => ({
            metric,
            value
          }));
          
          csvWriter.writeRecords(records)
            .then(() => {
              console.log('Caption analysis complete!');
              console.log('Results saved to caption_analysis.csv');
              console.table(results);
              resolve(results);
            });
        } else {
          console.log('No captions found in CSV file.');
          reject(new Error('No captions found'));
        }
      })
      .on('error', (error) => {
        console.error('Error analyzing captions:', error);
        reject(error);
      });
  });
};

// Run the analysis
analyzeCaptions().catch(console.error);
