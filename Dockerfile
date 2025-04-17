FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Make sure the application uses the PORT environment variable
ENV PORT=3000

# Build the application (if needed)
RUN npm run build || echo "No build script found"

# Start the application
CMD ["npm", "start"]
