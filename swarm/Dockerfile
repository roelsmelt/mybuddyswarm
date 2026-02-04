FROM node:20-slim

# Install OpenClaw CLI and PM2
RUN npm install -g @anthropic-ai/openclaw pm2

# Create data directories
RUN mkdir -p /data/bots /data/shared

# Copy swarm manager
WORKDIR /app
COPY . .

# Install dependencies
RUN npm install

# Expose port range for bots (18001-18200)
EXPOSE 8080

# Start swarm manager
CMD ["node", "manager.js"]
