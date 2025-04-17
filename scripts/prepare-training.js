// prepare-training-data.js
// Converts CSV captions into a format optimized for GPT training

const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Configuration
const INPUT_CSV = 'client_captions.csv';  // Your PhantomBuster CSV file
const OUTPUT_DIR = 'training_data';
const MAX_EXAMPLES_PER_FILE = 25;
const CAPTION_FIELD = 'caption';  // Change this to match your CSV structure

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// Process the CSV file
async function processCSV() {
  console.log(`Processing ${INPUT_CSV}...`);
  
  const captions = [];
  
  // Read captions from CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(INPUT_CSV)
      .pipe(csv())
      .on('data', (row) => {
        // Try to find the caption text in different possible field names
        const captionText = row[CAPTION_FIELD] || row['text'] || row['content'] || row['description'] || '';
        
        if (captionText && captionText.trim().length > 0) {
          captions.push({
            text: captionText.trim(),
            date: row['date'] || row['timestamp'] || 'Unknown',
            engagement: row['likes'] || row['engagement'] || 'Unknown'
          });
        }
      })
      .on('end', () => {
        console.log(`Found ${captions.length} captions in the CSV file.`);
        resolve();
      })
      .on('error', (error) => {
        console.error('Error reading CSV:', error);
        reject(error);
      });
  });
  
  // Sort captions by engagement if available
  captions.sort((a, b) => {
    const engA = parseInt(a.engagement) || 0;
    const engB = parseInt(b.engagement) || 0;
    return engB - engA;  // Descending order
  });
  
  // Create an overview file
  const overviewContent = `# Client Caption Style Guide

## Caption Collection Overview
- Total Captions: ${captions.length}
- Date Range: ${getDateRange(captions)}
- Average Engagement: ${getAverageEngagement(captions)}

## Style Characteristics

${analyzeStyle(captions)}

## Top Performing Captions

${formatTopCaptions(captions.slice(0, 10))}
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'caption_overview.md'), overviewContent);
  console.log('Created caption overview file.');
  
  // Split captions into smaller files
  const numFiles = Math.ceil(captions.length / MAX_EXAMPLES_PER_FILE);
  
  for (let i = 0; i < numFiles; i++) {
    const startIdx = i * MAX_EXAMPLES_PER_FILE;
    const endIdx = Math.min(startIdx + MAX_EXAMPLES_PER_FILE, captions.length);
    const batchCaptions = captions.slice(startIdx, endIdx);
    
    let fileContent = `# Client Caption Examples (Batch ${i+1} of ${numFiles})\n\n`;
    
    batchCaptions.forEach((caption, idx) => {
      fileContent += `## Caption ${startIdx + idx + 1}\n\n\`\`\`\n${caption.text}\n\`\`\`\n\n`;
      
      if (caption.date !== 'Unknown') {
        fileContent += `**Date:** ${caption.date}\n\n`;
      }
      
      if (caption.engagement !== 'Unknown') {
        fileContent += `**Engagement:** ${caption.engagement}\n\n`;
      }
      
      fileContent += '---\n\n';
    });
    
    fs.writeFileSync(
      path.join(OUTPUT_DIR, `captions_batch_${i+1}.md`), 
      fileContent
    );
  }
  
  console.log(`Created ${numFiles} batch files in ${OUTPUT_DIR} directory.`);
  
  // Create a summary file with all captions in a single list
  let allCaptionsContent = `# All Client Captions\n\nThis file contains all ${captions.length} captions in a simple list format.\n\n`;
  
  captions.forEach((caption, idx) => {
    allCaptionsContent += `### Caption ${idx + 1}\n\n${caption.text}\n\n---\n\n`;
  });
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'all_captions.md'), allCaptionsContent);
  console.log('Created complete caption list file.');
  
  console.log('\nTraining data preparation complete! Upload these files to your Custom GPT.');
}

// Helper functions
function getDateRange(captions) {
  const dates = captions
    .map(c => c.date)
    .filter(d => d !== 'Unknown')
    .map(d => new Date(d))
    .filter(d => !isNaN(d.getTime()));
  
  if (dates.length === 0) return 'Unknown';
  
  const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
  const latest = new Date(Math.max(...dates.map(d => d.getTime())));
  
  return `${formatDate(earliest)} to ${formatDate(latest)}`;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getAverageEngagement(captions) {
  const engagements = captions
    .map(c => parseInt(c.engagement))
    .filter(e => !isNaN(e));
  
  if (engagements.length === 0) return 'Unknown';
  
  const average = engagements.reduce((sum, val) => sum + val, 0) / engagements.length;
  return average.toFixed(1);
}

function analyzeStyle(captions) {
  // Simple analysis of caption characteristics
  const lengths = captions.map(c => c.text.length);
  const avgLength = lengths.reduce((sum, len) => sum + len, 0) / captions.length;
  
  // Count hashtags
  const hashtagCount = captions.reduce((sum, caption) => {
    const matches = caption.text.match(/#[\w\u00C0-\u017F]+/g) || [];
    return sum + matches.length;
  }, 0);
  
  const avgHashtags = hashtagCount / captions.length;
  
  // Count emojis (simple approximation)
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  
  const emojiCount = captions.reduce((sum, caption) => {
    const matches = caption.text.match(emojiRegex) || [];
    return sum + matches.length;
  }, 0);
  
  const avgEmojis = emojiCount / captions.length;
  
  // Identify common phrases (simplified)
  const words = captions
    .map(c => c.text.toLowerCase())
    .join(' ')
    .replace(/#[\w\u00C0-\u017F]+/g, '') // Remove hashtags
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(w => w.length > 3);
  
  const wordFreq = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });
  
  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => `${word} (${count})`)
    .join(', ');
  
  return `Based on analysis of the captions, the client's style has these characteristics:

- **Average Length:** ${Math.round(avgLength)} characters
- **Hashtag Usage:** ${avgHashtags.toFixed(1)} hashtags per post
- **Emoji Usage:** ${avgEmojis.toFixed(1)} emojis per post
- **Common Words:** ${topWords}
- **Sentence Structure:** ${getSentenceStructure(captions)}
- **Tone:** ${determineTone(captions)}`;
}

function getSentenceStructure(captions) {
  // Sample 10 random captions to analyze sentence structure
  const sampleCaptions = captions
    .sort(() => 0.5 - Math.random())
    .slice(0, 10);
  
  const sentenceCounts = sampleCaptions.map(c => {
    const text = c.text.replace(/#[\w\u00C0-\u017F]+/g, ''); // Remove hashtags
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  });
  
  const avgSentences = sentenceCounts.reduce((sum, count) => sum + count, 0) / sentenceCounts.length;
  
  if (avgSentences < 1.5) {
    return 'Typically uses short, single sentences or fragments';
  } else if (avgSentences < 3) {
    return 'Usually 1-2 sentences with moderate length';
  } else {
    return 'Often uses multiple sentences (3+) with more detailed descriptions';
  }
}

function determineTone(captions) {
  // Very simple tone analysis based on keywords and punctuation
  const text = captions.map(c => c.text).join(' ').toLowerCase();
  
  const exclamations = (text.match(/!/g) || []).length / captions.length;
  const questions = (text.match(/\?/g) || []).length / captions.length;
  
  const enthusiasticWords = ['love', 'amazing', 'excited', 'wow', 'awesome', 'incredible', 'best'];
  const formalWords = ['announce', 'introducing', 'official', 'presenting', 'proud'];
  const casualWords = ['hey', 'check', 'just', 'gonna', 'btw', 'lol'];
  
  let enthusiasmCount = 0;
  let formalCount = 0;
  let casualCount = 0;
  
  enthusiasticWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    enthusiasmCount += (text.match(regex) || []).length;
  });
  
  formalWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    formalCount += (text.match(regex) || []).length;
  });
  
  casualWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    casualCount += (text.match(regex) || []).length;
  });
  
  enthusiasmCount /= captions.length;
  formalCount /= captions.length;
  casualCount /= captions.length;
  
  if (enthusiasmCount > 0.3 || exclamations > 0.7) {
    return 'Enthusiastic and energetic, often using exclamation points and positive language';
  } else if (formalCount > 0.2) {
    return 'Professional and somewhat formal, focusing on announcements and product benefits';
  } else if (casualCount > 0.2 || questions > 0.3) {
    return 'Casual and conversational, often directly addressing the audience';
  } else {
    return 'Balanced mix of professional and conversational elements';
  }
}

function formatTopCaptions(captions) {
  return captions.map((caption, idx) => 
    `### ${idx + 1}. ${caption.engagement !== 'Unknown' ? `(${caption.engagement} engagement)` : ''}\n\n\`\`\`\n${caption.text}\n\`\`\`\n`
  ).join('\n');
}

// Run the script
processCSV().catch(console.error);
