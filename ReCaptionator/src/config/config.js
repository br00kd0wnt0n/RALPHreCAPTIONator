require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 4000,
    env: process.env.NODE_ENV || 'development',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.MAX_TOKENS) || 1000,
    temperature: parseFloat(process.env.TEMPERATURE) || 0.7,
  },
  app: {
    maxTweetsToAnalyze: parseInt(process.env.MAX_TWEETS_TO_ANALYZE) || 140,
    logLevel: process.env.LOG_LEVEL || 'info',
    maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE) || 60,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4000',
  },
}; 