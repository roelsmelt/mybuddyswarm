FROM node:22-slim

# Build argument: which buddy to deploy (e.g., roelbuddy-emrys, estherbuddy-kazeh)
ARG BUDDY_ID=roelbuddy-emrys

# Install basics
RUN apt-get update && apt-get install -y curl ssh tar procps git python3 python3-requests && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Ensure we have the latest clawdbot
RUN npm install clawdbot

# Setup entrypoint
COPY entrypoint.sh /entrypoint.sh
COPY discover_models.py /app/discover_models.py
RUN chmod +x /entrypoint.sh

# CLAWDBOT_HOME for personal data
ENV CLAWDBOT_HOME="/root/.clawdbot"

# Copy buddy-specific personal data into image
# This includes workspace (SOUL.MD, IDENTITY.MD, etc.) and config
COPY buddies/${BUDDY_ID}/workspace/ /root/.clawdbot/workspace/
COPY buddies/${BUDDY_ID}/config/ /root/.clawdbot/config/

# Store buddy identity for entrypoint
ENV BUDDY_ID=${BUDDY_ID}

# DEBUG: Ensure logs are not buffered
ENV NODE_LOG_LEVEL=debug
ENV DEBUG="clawdbot:*"

ENTRYPOINT ["/entrypoint.sh"]
