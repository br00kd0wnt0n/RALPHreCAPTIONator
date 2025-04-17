// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { OpenAI } = require('openai');

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Validate API key
if (!process.env.OPENAI_API_KEY) {
  process.stderr.write('Error: OPENAI_API_KEY environment variable is not set\n');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Error handling middleware
app.use((err, req, res, next) => {
  process.stderr.write(`Error: ${err}\n`);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Initialize OpenAI with API key from environment variable
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  process.stdout.write('OpenAI client initialized successfully\n');
} catch (error) {
  process.stderr.write(`Failed to initialize OpenAI client: ${error}\n`);
  process.exit(1);
}

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

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is missing');
    }
    
    if (!fs.existsSync('client_captions.csv')) {
      throw new Error('CSV file not found');
    }
    
    res.status(200).json({ 
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    process.stderr.write(`Health check failed: ${error}\n`);
    res.status(500).json({ 
      status: 'error',
      error: error.message
    });
  }
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
    process.stderr.write('Error generating caption: ' + error + '\n');
    res.status(500).json({ error: 'Failed to generate caption' });
  }
});

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server with error handling
let server;
try {
  server = app.listen(PORT, '0.0.0.0', () => {
    process.stdout.write('====================================\n');
    process.stdout.write('Server started successfully\n');
    process.stdout.write(`Port: ${PORT}\n`);
    process.stdout.write(`Environment: ${process.env.NODE_ENV || 'development'}\n`);
    process.stdout.write(`OpenAI API Key present: ${!!process.env.OPENAI_API_KEY}\n`);
    process.stdout.write(`Health check endpoint: http://localhost:${PORT}/health\n`);
    process.stdout.write('====================================\n');
  });
} catch (error) {
  process.stderr.write(`Failed to start server: ${error}\n`);
  process.exit(1);
}

// Handle server errors
server.on('error', (error) => {
  process.stderr.write(`Server error: ${error}\n`);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  process.stdout.write('SIGTERM received. Shutting down gracefully...\n');
  server.close(() => {
    process.stdout.write('Server closed. Exiting...\n');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  process.stderr.write(`Uncaught Exception: ${err}\n`);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  process.stderr.write(`Unhandled Rejection at: ${promise}, reason: ${reason}\n`);
  process.exit(1);
});
