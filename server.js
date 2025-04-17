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
const loadCaptionsFromCSV = () => {
  return new Promise((resolve, reject) => {
    const captions = [];
    fs.createReadStream('client_captions.csv')
      .pipe(csv())
      .on('data', (row) => {
        // Assuming the caption text is in a field called 'caption' or 'text'
        if (row.caption) {
          captions.push(row.caption);
        } else if (row.text) {
          captions.push(row.text);
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

// Add a health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API endpoint to generate captions
app.post('/api/generate-caption', async (req, res) => {
  try {
    const { draftCaption, contentType, contentTheme, additionalNotes } = req.body;
    
    // Load reference captions from CSV
    const referenceCaptions = await loadCaptionsFromCSV();
    
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

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Log when server starts
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
