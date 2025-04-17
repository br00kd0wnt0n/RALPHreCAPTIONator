# Use Node.js 18 Alpine as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy application files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Create non-root user and set permissions
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app \
    && chmod -R 755 /app

# Switch to non-root user
USER appuser

# Expose the port
EXPOSE 8080

# Start the application with proper error handling
CMD ["node", "--trace-warnings", "server.js"]
