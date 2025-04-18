// japanese_caption_generator.js
// Implementation of the Japanese caption generator using the prompt template

const fs = require('fs');
const csv = require('csv-parser');
const { OpenAI } = require('openai');
const { createJapaneseCaptionPrompt } = require('./japanese_prompt_template');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Loads Japanese captions from the CSV file
 * @param {string} filePath - Path to the CSV file containing captions
 * @returns {Promise<Array<string>>} - Array of caption texts
 */
async function loadJapaneseCaptions(filePath) {
  const captions = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Extract caption text from the appropriate field
        // Adjust field name based on your CSV structure 
        const captionText = row.text || row.caption || row.description || '';
        if (captionText) {
          captions.push(captionText);
        }
      })
      .on('end', () => {
        console.log(`Loaded ${captions.length} Japanese captions from CSV file`);
        resolve(captions);
      })
      .on('error', (error) => {
        console.error('Error loading captions:', error);
        reject(error);
      });
  });
}

/**
 * Generates a Japanese caption based on client's style
 * @param {string} draftCaption - The draft caption or description
 * @param {string} contentType - Type of content (image, video, etc.)
 * @param {string} contentTheme - Theme of the content
 * @param {string} additionalNotes - Any additional requirements
 * @returns {Promise<string>} - The generated Japanese caption
 */
async function generateJapaneseCaption(draftCaption, contentType, contentTheme, additionalNotes) {
  try {
    // Load example captions
    const exampleCaptions = await loadJapaneseCaptions('./client_captions.csv');
    
    if (exampleCaptions.length === 0) {
      throw new Error('No example captions found. Please check your CSV file.');
    }
    
    // Create the prompt using our template
    const prompt = createJapaneseCaptionPrompt(
      draftCaption,
      contentType,
      contentTheme,
      additionalNotes,
      exampleCaptions
    );
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // or "gpt-4-turbo" if available
      ...prompt,
    });
    
    // Extract and return the generated caption
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating Japanese caption:', error);
    throw error;
  }
}

/**
 * Logs feedback from Japanese team for future improvements
 * @param {string} originalDraft - The original draft caption
 * @param {string} generatedCaption - The AI-generated caption
 * @param {string} feedback - Feedback from the Japanese team
 * @param {string} rating - Numerical rating (1-5)
 */
function logJapaneseFeedback(originalDraft, generatedCaption, feedback, rating) {
  const timestamp = new Date().toISOString();
  const feedbackEntry = {
    timestamp,
    originalDraft,
    generatedCaption,
    feedback,
    rating
  };
  
  // Create the feedback directory if it doesn't exist
  if (!fs.existsSync('./feedback')) {
    fs.mkdirSync('./feedback');
  }
  
  // Append to the feedback log file
  const feedbackString = JSON.stringify(feedbackEntry) + '\n';
  fs.appendFile('./feedback/japanese_caption_feedback.jsonl', feedbackString, (err) => {
    if (err) {
      console.error('Error saving feedback:', err);
    } else {
      console.log('Feedback saved successfully');
    }
  });
}

module.exports = {
  generateJapaneseCaption,
  loadJapaneseCaptions,
  logJapaneseFeedback
};
