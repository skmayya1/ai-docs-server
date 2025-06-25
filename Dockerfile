# Use official Node.js base image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install LibreOffice and dependencies
RUN apt-get update && \
    apt-get install -y libreoffice libreoffice-writer && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json tsconfig.json ./

RUN npm install


# Copy source code
COPY ./src ./src

# Build TypeScript to JavaScript
RUN npx tsc

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "dist/index.js"]