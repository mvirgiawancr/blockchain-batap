# Backend Express Dockerfile for LAM-TEK 2025# Backend Express Dockerfile for LAM-TEK 2025

FROM node:18-alpineFROM node:18-alpine



# Set working directory# Set working directory

WORKDIR /appWORKDIR /app



# Copy package files# Copy package files

COPY package*.json ./COPY package*.json ./



# Install dependencies# Install dependencies

RUN npm ci --only=productionRUN npm ci --only=production



# Copy application code# Copy application code

COPY . .COPY . .



# Create logs directory# Create logs directory

RUN mkdir -p logsRUN mkdir -p logs



# Expose port# Expose port

EXPOSE 8000EXPOSE 8000



# Health check# Health check

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \

  CMD node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"  CMD node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"



# Start application# Start application

CMD ["npm", "start"]CMD ["npm", "start"]

