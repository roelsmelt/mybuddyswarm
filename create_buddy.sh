#!/bin/bash
set -e

NAME=$1
PHONE=$2
BOTS_DIR="/bots"
SOURCE_DIR="$BOTS_DIR/template"
NEW_BOT_DIR="$BOTS_DIR/$NAME"

if [ -z "$NAME" ] || [ -z "$PHONE" ]; then
  echo "Usage: $0 <name> <phone>"
  exit 1
fi

if [ -d "$NEW_BOT_DIR" ]; then
  echo "Error: Bot $NAME already exists."
  exit 1
fi

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: Template directory $SOURCE_DIR not found!"
  exit 1
fi

echo "🐝 Creating Buddy '$NAME' for $PHONE..."

# 1. Clone Template
echo " -> Cloning template..."
cp -r "$SOURCE_DIR" "$NEW_BOT_DIR"

# 2. Cleanup (Just in case template is dirty)
echo " -> Cleaning workspace..."
rm -rf "$NEW_BOT_DIR/workspace/.git"
rm -rf "$NEW_BOT_DIR/workspace/memory"/*
rm -rf "$NEW_BOT_DIR/workspace/canvas"/*
# Ensure no credentials/sessions carried over
rm -rf "$NEW_BOT_DIR/config/credentials"
rm -rf "$NEW_BOT_DIR/config/identity"
rm -rf "$NEW_BOT_DIR/config/subagents"
rm -rf "$NEW_BOT_DIR/config/devices"
rm -rf "$NEW_BOT_DIR/config/media"
rm -rf "$NEW_BOT_DIR/config/baileys_auth_info"

# 3. Configure (using Python for JSON safety)
echo " -> Updating configuration..."
python3 -c "
import json
import os
import sys

config_path = '$NEW_BOT_DIR/config/clawdbot.json'
if os.path.exists(config_path):
    with open(config_path, 'r') as f:
        data = json.load(f)
    
    # Update WhatsApp allow list
    if 'channels' in data and 'whatsapp' in data['channels']:
        data['channels']['whatsapp']['allowFrom'] = ['$PHONE']
    
    # Remove Beekeeper capability from child (avoid recursion)
    if 'plugins' in data and 'entries' in data['plugins'] and 'beekeeper' in data['plugins']['entries']:
        del data['plugins']['entries']['beekeeper']
        
    with open(config_path, 'w') as f:
        json.dump(data, f, indent=2)
"

# 4. Identity
echo " -> Setting identity..."
echo "# User Profile" > "$NEW_BOT_DIR/workspace/USER.md"
echo "" >> "$NEW_BOT_DIR/workspace/USER.md"
echo "Phone: $PHONE" >> "$NEW_BOT_DIR/workspace/USER.md"
echo "(Auto-generated)" >> "$NEW_BOT_DIR/workspace/USER.md"

echo "# Identity" > "$NEW_BOT_DIR/workspace/IDENTITY.md"
echo "" >> "$NEW_BOT_DIR/workspace/IDENTITY.md"
echo "I am $NAME, a Buddy in the Molt Swarm." >> "$NEW_BOT_DIR/workspace/IDENTITY.md"

# 5. Calculate Port (Simple Hash)
# Shell has limit, use python for consistent hashing
PORT=$(python3 -c "print(18790 + (abs(hash('$NAME')) % 100))")
echo " -> Assigned Internal Port: $PORT"

# 6. Launch Container
echo " -> Launching container..."
docker run -d \
  --name "buddy-$NAME" \
  --restart always \
  --network molt-bot-network \
  -e NODE_ENV=production \
  -e GOG_KEYRING_PASSWORD=clawdbot2026 \
  -e GOG_ACCOUNT=rulerulez@gmail.com \
  -e GEMINI_API_KEY="$GEMINI_API_KEY" \
  -e GOG_GATEWAY_HOST=0.0.0.0 \
  -v "$NEW_BOT_DIR/workspace:/root/clawd" \
  -v "$NEW_BOT_DIR/config:/root/.clawdbot" \
  -v "/shared:/shared" \
  -v "/bots:/bots" \
  -v "/var/run/docker.sock:/var/run/docker.sock" \
  -p "$PORT:18789" \
  molt-bot-platform-engine:latest \
  clawdbot gateway --port 18789

echo "✅ Success! Buddy '$NAME' is live on port $PORT."
