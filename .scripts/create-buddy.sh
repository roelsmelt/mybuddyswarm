#!/bin/bash
# Railway Buddy Creation Script
# Creates a new Buddy service with all required configuration

set -e

# Configuration
BUDDY_NAME=$1
HUMAN_NAME=$2
SERVICE_NAME="${HUMAN_NAME} | ${BUDDY_NAME}"
VOLUME_NAME="${BUDDY_NAME,,}-data"  # lowercase
TELEGRAM_BOT_TOKEN=$3

if [ -z "$BUDDY_NAME" ] || [ -z "$HUMAN_NAME" ]; then
  echo "Usage: ./create-buddy.sh <BUDDY_NAME> <HUMAN_NAME> [TELEGRAM_BOT_TOKEN]"
  echo "Example: ./create-buddy.sh Galahad Roel 8259658096:AAHj5sH28QvMIz..."
  exit 1
fi

echo "🦞 Creating Buddy: $SERVICE_NAME"
echo "Volume: $VOLUME_NAME"

# Generate secrets
GATEWAY_TOKEN=$(openssl rand -hex 32)
SETUP_PASSWORD=$(openssl rand -hex 16)

echo "✅ Generated secrets"

# Create service via Railway CLI (assumes already linked to project)
echo "📦 Creating Railway service..."

# Note: Railway CLI doesn't support direct service creation
# User must create service via dashboard first, then we configure it

echo "⚠️  Please create service '$SERVICE_NAME' via Railway dashboard first"
echo ""
echo "After creation, run:"
echo "  railway link -s <SERVICE_ID>"
echo "  railway variables set \\"
echo "    OPENCLAW_STATE_DIR=/data/.openclaw \\"
echo "    OPENCLAW_WORKSPACE_DIR=/data/workspace \\"
echo "    OPENCLAW_GATEWAY_TOKEN=$GATEWAY_TOKEN \\"
echo "    SETUP_PASSWORD=$SETUP_PASSWORD \\"
echo "    INTERNAL_GATEWAY_HOST=127.0.0.1 \\"
echo "    INTERNAL_GATEWAY_PORT=18789 \\"
echo "    ENABLE_WEB_TUI=false"

if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
  echo "    TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN"
fi

echo ""
echo "📝 Save these credentials:"
echo "Service: $SERVICE_NAME"
echo "Volume: $VOLUME_NAME"
echo "Gateway Token: $GATEWAY_TOKEN"
echo "Setup Password: $SETUP_PASSWORD"
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
  echo "Telegram Token: $TELEGRAM_BOT_TOKEN"
fi
