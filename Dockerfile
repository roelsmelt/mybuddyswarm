FROM node:22-slim

# Install basics
RUN apt-get update && apt-get install -y curl ssh tar procps git python3 python3-requests && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Ensure we have the latest clawdbot
RUN npm install clawdbot

# Setup entrypoint
COPY entrypoint.sh /entrypoint.sh
COPY discover_models.py /app/discover_models.py
RUN chmod +x /entrypoint.sh

# CLAWDBOT_HOME should be the volume mount
ENV CLAWDBOT_HOME="/root/clawd"

# DEBUG: Ensure logs are not buffered
ENV NODE_LOG_LEVEL=debug
ENV DEBUG="clawdbot:*"

ENTRYPOINT ["/entrypoint.sh"]
