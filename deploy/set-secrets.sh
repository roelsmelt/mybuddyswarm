#!/bin/bash
set -e

BUDDY_ID=$1
APP_NAME="$BUDDY_ID-buddy"

if [ -z "$BUDDY_ID" ]; then
  echo "Usage: ./set-secrets.sh <buddy-id>"
  exit 1
fi

echo "🔐 Setting secrets for $APP_NAME..."

# Generate gateway token
GATEWAY_TOKEN=$(openssl rand -hex 32)

# Prompt for API keys if not in environment
if [ -z "$GEMINI_API_KEY" ]; then
  echo "Enter GEMINI_API_KEY:"
  read -s GEMINI_API_KEY
fi

if [ -z "$BRAVE_API_KEY" ]; then
  echo "Enter BRAVE_API_KEY:"
  read -s BRAVE_API_KEY
fi

# Set secrets
fly secrets set --app "$APP_NAME" \
  OPENCLAW_GATEWAY_TOKEN="$GATEWAY_TOKEN" \
  GEMINI_API_KEY="$GEMINI_API_KEY" \
  BRAVE_API_KEY="$BRAVE_API_KEY"

echo "✅ Secrets set for $APP_NAME"
echo ""
echo "Gateway token (save this): $GATEWAY_TOKEN"
