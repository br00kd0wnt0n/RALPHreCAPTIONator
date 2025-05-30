# Ralph's Re-Caption-ator (tm) - Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Ensure data directory exists
RUN mkdir -p /app/data

# Copy CSV data (if present)
COPY korean_air_tweets.csv ./

# Expose port 4000 (matches app config)
EXPOSE 4000

# Health check on port 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

# NOTE: You must provide a .env file with your OpenAI key at build or runtime

# Start Ralph
CMD ["npm", "start"]
