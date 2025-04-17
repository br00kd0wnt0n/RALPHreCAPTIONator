// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { OpenAI } = require('openai');

// Immediate startup logging
console.log('Starting application...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || 8080);
console.log('OpenAI API Key present:', !!process.env.OPENAI_API_KEY);

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Validate API key
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Initialize OpenAI with API key from environment variable
console.log('Initializing OpenAI client...');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
console.log('OpenAI client initialized');

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
  console.log('Health check requested');
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is missing');
    }
    
    if (!fs.existsSync('client_captions.csv')) {
      throw new Error('CSV file not found');
    }
    
    console.log('Health check passed');
    res.status(200).json({ 
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
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
    console.error('Error generating caption:', error);
    res.status(500).json({ error: 'Failed to generate caption' });
  }
});

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
console.log('Starting server...');
console.log('Current working directory:', process.cwd());
console.log('Directory contents:', fs.readdirSync('.'));
console.log('Checking for client_captions.csv:', fs.existsSync('client_captions.csv'));
console.log('Hostname:', require('os').hostname());

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('====================================');
  console.log('Server started successfully');
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`OpenAI API Key present: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`Health check endpoint: http://0.0.0.0:${PORT}/health`);
  console.log('====================================');
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  console.error('Error details:', {
    code: err.code,
    message: err.message,
    stack: err.stack
  });
  process.exit(1);
});

// Add a simple test endpoint
app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Test endpoint is working' });
});

// Add request timeout handling
server.setTimeout(30000); // 30 seconds timeout

// Add keep-alive settings
server.keepAliveTimeout = 120000; // 2 minutes
server.headersTimeout = 120000; // 2 minutes

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  app.close(() => {
    console.log('Server closed. Exiting...');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
