#!/bin/bash
set -e

# Usage: ./spawn_buddy.sh <human-name> <buddy-name> <telegram-token>
# Example: ./spawn_buddy.sh roel emrys 8303141982:AAGxxx

HUMAN_NAME=$1
BUDDY_NAME=$2
TELEGRAM_TOKEN=$3

if [ -z "$HUMAN_NAME" ] || [ -z "$BUDDY_NAME" ]; then
  echo "Usage: ./spawn_buddy.sh <human-name> <buddy-name> [telegram-token]"
  echo "Example: ./spawn_buddy.sh roel emrys 8303141982:AAGxxx"
  exit 1
fi

PROJECT_NAME="${HUMAN_NAME}-${BUDDY_NAME}"

echo "🚀 Spawning buddy: $PROJECT_NAME"

# Load secrets
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../.env.secrets"

# 1. Create Railway project
echo "📦 Creating Railway project..."
railway init --name "$PROJECT_NAME"

# 2. Add OpenClaw service from GitHub
echo "🔗 Adding OpenClaw service..."
# Note: This requires interactive selection, so we use the template approach
echo "⚠️  Go to https://railway.com/new/template/openclaw"
echo "   Select 'Deploy to existing project' → $PROJECT_NAME"
echo ""
read -p "Press Enter when deployed..."

# 3. Link to the project
railway link

# 4. Set environment variables
echo "🔐 Setting environment variables..."
railway variables set GEMINI_API_KEY="$GEMINI_API_KEY"

if [ -n "$TELEGRAM_TOKEN" ]; then
  railway variables set TELEGRAM_BOT_TOKEN="$TELEGRAM_TOKEN"
fi

# 5. Get the URL
echo ""
echo "✅ Buddy $PROJECT_NAME spawned!"
railway domain

echo ""
echo "📝 Next steps:"
echo "1. Go to the setup URL above + /setup"
echo "2. Configure channels"
echo "3. Upload SOUL.md and IDENTITY.md to /data/workspace/"
