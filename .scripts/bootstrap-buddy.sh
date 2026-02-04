#!/bin/bash
# Bootstrap OpenClaw Buddy via Setup API
# This script automatically configures a new Buddy instance programmatically

set -e

# Configuration
BUDDY_URL=$1
SETUP_PASSWORD=$2
GEMINI_API_KEY=$3
MODEL=${4:-"google/gemini-2.0-flash-exp"}
TELEGRAM_BOT_TOKEN=$5

if [ -z "$BUDDY_URL" ] || [ -z "$SETUP_PASSWORD" ] || [ -z "$GEMINI_API_KEY" ]; then
  echo "Usage: ./bootstrap-buddy.sh <BUDDY_URL> <SETUP_PASSWORD> <GEMINI_API_KEY> [MODEL] [TELEGRAM_BOT_TOKEN]"
  echo ""
  echo "Example:"
  echo "  ./bootstrap-buddy.sh https://galahad.up.railway.app \\"
  echo "    '3c14da10a2bc0648293f1df2bc5802f3' \\"
  echo "    'AIzaSy...' \\"
  echo "    'google/gemini-2.0-flash-exp' \\"
  echo "    '8259658096:AAHj5sH28...'"
  exit 1
fi

echo "🦞 Bootstrapping OpenClaw Buddy"
echo "URL: $BUDDY_URL"
echo "Model: $MODEL"

# Step 1: Check status
echo ""
echo "📡 Checking buddy status..."
STATUS=$(curl -s -u ":$SETUP_PASSWORD" "$BUDDY_URL/setup/api/status")
echo "$STATUS" | jq '.'

CONFIGURED=$(echo "$STATUS" | jq -r '.configured')
if [ "$CONFIGURED" = "true" ]; then
  echo "⚠️  Buddy is already configured!"
  echo "If you want to reconfigure, reset it first via the setup UI or manually delete the config."
  exit 0
fi

# Step 2: Run setup wizard
echo ""
echo "🔧 Running setup wizard..."

SETUP_PAYLOAD=$(cat <<EOF
{
  "flow": "quickstart",
  "authChoice": "gemini",
  "authSecret": "$GEMINI_API_KEY",
  "model": "$MODEL",
  "telegramToken": "$TELEGRAM_BOT_TOKEN",
  "discordToken": "",
  "slackBotToken": "",
  "slackAppToken": ""
}
EOF
)

SETUP_RESULT=$(curl -s -u ":$SETUP_PASSWORD" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$SETUP_PAYLOAD" \
  "$BUDDY_URL/setup/api/run")

echo "$SETUP_RESULT" | jq -r '.output'
SETUP_OK=$(echo "$SETUP_RESULT" | jq -r '.ok')

if [ "$SETUP_OK" != "true" ]; then
  echo "❌ Setup failed!"
  exit 1
fi

echo "✅ Setup completed successfully"

# Step 3: Run doctor
echo ""
echo "🏥 Running doctor..."
DOCTOR_RESULT=$(curl -s -u ":$SETUP_PASSWORD" \
  -X POST \
  -H "Content-Type: application/json" \
  "$BUDDY_URL/setup/api/doctor")

echo "$DOCTOR_RESULT" | jq -r '.output'

# Step 4: Instructions for pairing
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
  echo ""
  echo "📱 Telegram Pairing Instructions:"
  echo "1. Open Telegram and find your bot"
  echo "2. Send /start to the bot"
  echo "3. The bot will reply with a pairing code (e.g., 'ABC12345')"
  echo "4. Approve the pairing via setup UI at: $BUDDY_URL/setup"
  echo "   OR use the pairing API:"
  echo ""
  echo "   curl -u \":$SETUP_PASSWORD\" -X POST \\"
  echo "     -H \"Content-Type: application/json\" \\"
  echo "     -d '{\"channel\":\"telegram\",\"code\":\"YOUR_PAIRING_CODE\"}' \\"
  echo "     \"$BUDDY_URL/setup/api/pairing/approve\""
fi

echo ""
echo "🎉 Bootstrap complete!"
echo ""
echo "Next steps:"
echo "  - Access OpenClaw UI: $BUDDY_URL/openclaw"
echo "  - Setup wizard: $BUDDY_URL/setup"
echo "  - Complete Telegram pairing if you haven't done so"
