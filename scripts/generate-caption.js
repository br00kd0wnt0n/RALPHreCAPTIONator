// generate-caption.js
// A standalone script for generating captions using the OpenAI API directly

const fs = require('fs');
const csv = require('csv-parser');
const { OpenAI } = require('openai');
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
  // Get input from command line arguments or prompt for it
  let draftCaption, contentType, contentTheme, additionalNotes;
  
  if (args.length >= 1) {
    draftCaption = args[0];
    contentType = args.length >= 2 ? args[1] : 'image';
    contentTheme = args.length >= 3 ? args[2] : 'product';
    additionalNotes = args.length >= 4 ? args[3] : '';
  } else {
    // If no arguments provided, exit with error
    console.error('Error: No draft caption provided.');
    console.log('Type "node generate-caption.js --help" for usage information.');
    process.exit(1);
  }
  
  console.log('Generating caption in client\'s style...');
  
  try {
    const generatedCaption = await generateCaption(
      draftCaption,
      contentType,
      contentTheme,
      additionalNotes
    );
    
    console.log('\n----- Generated Caption -----\n');
    console.log(generatedCaption);
    console.log('\n-----------------------------\n');
    
    // Save the result to a file
    fs.writeFileSync('last_generated_caption.txt', generatedCaption);
    console.log('Caption saved to last_generated_caption.txt');
  } catch (error) {
    console.error('Failed to generate caption:', error.message);
    process.exit(1);
  }
};

// Run the CLI if this file is executed directly
if (require.main === module) {
  runCLI();
}

// Export the function for use in other modules
module.exports = { generateCaption };
apiKey: process.env.OPENAI_API_KEY,
});

// Function to read captions from CSV
const readCaptionsFromCSV = async (filePath) => {
  const captions = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Adjust the field name based on your CSV structure
        const captionText = row.caption || row.text || row.content || '';
        if (captionText) {
          captions.push(captionText);
        }
      })
      .on('end', () => {
        resolve(captions);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// Function to generate a caption in client's style
const generateCaption = async (draftCaption, contentType, contentTheme, additionalNotes) => {
  try {
    // Get reference captions
    const captions = await readCaptionsFromCSV('./client_captions.csv');
    
    // Select a random subset of captions to use as examples (to prevent exceeding token limits)
    const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
    const sampleCaptions = shuffle(captions).slice(0, 8);
    
    // Format the caption examples
    const captionExamples = sampleCaptions.map((caption, index) => 
      `Example ${index + 1}:\n${caption}`
    ).join('\n\n');
    
    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4", // or "gpt-3.5-turbo" for a more economical option
      messages: [
        {
          role: "system",
          content: `You are an expert social media copywriter who specializes in mimicking a client's unique style.
          
Your task is to analyze the following example captions from a client and then generate a new caption in their distinctive style.

CAPTION EXAMPLES:
${captionExamples}

Analyze these captions for:
1. Tone and voice (casual, formal, enthusiastic, minimalist, etc.)
2. Sentence structure and length
3. Vocabulary choices and recurring phrases
4. Emoji usage patterns
5. Hashtag style and placement
6. Call-to-action approaches

Then, rewrite the provided draft caption to perfectly match the client's style while preserving the core message.`
        },
        {
          role: "user",
          content: `Please rewrite this draft caption in my client's distinctive style:

DRAFT CAPTION: ${draftCaption}

CONTENT TYPE: ${contentType}
CONTENT THEME: ${contentTheme}
ADDITIONAL NOTES: ${additionalNotes}

Generate a caption that maintains my client's unique voice while conveying this message.`
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating caption:', error);
    throw error;
  }
};

// Command line interface
const runCLI = async () => {
  // Check if OpenAI API key is set
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY not found in environment variables.');
    console.log('Please set your OpenAI API key in the .env file.');
    process.exit(1);
  }
  
  // Simple command-line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Caption Generator CLI

Usage:
  node generate-caption.js "<draft caption>" "<content type>" "<content theme>" "<additional notes>"

Example:
  node generate-caption.js "New product launch today!" "image" "product" "Include hashtags"
    `);
    process.exit(0);
  }
  
  