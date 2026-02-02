#!/bin/bash
# Deep scrub of config files
export CLAWDBOT_HOME="/root/.clawdbot"
CONFIG_PATH="$CLAWDBOT_HOME/config/clawdbot.json"
EXTRA_CONFIG="$CLAWDBOT_HOME/clawdbot.json"

echo "🗑️ Wiping extra config files..."
rm -f "$EXTRA_CONFIG"

echo "🔧 Writing clean stabilized config..."
cat <<EYE > "$CONFIG_PATH"
{
  "env": {
    "GEMINI_API_KEY": "${GEMINI_API_KEY}",
    "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
    "BRAVE_API_KEY": "${BRAVE_API_KEY}",
    "TELEGRAM_BOT_TOKEN": "${CLAWDBOT_TELEGRAM_TOKEN}",
    "TELEGRAM_ADMIN_ID": 6528670828,
    "GOG_ACCOUNT": "rulerulez@gmail.com"
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "google/gemini-1.5-flash",
        "fallbacks": [
          "anthropic/claude-3-5-sonnet-latest",
          "anthropic/claude-3-haiku-20241022"
        ]
      }
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "${CLAWDBOT_TELEGRAM_TOKEN}",
      "dmPolicy": "pairing"
    },
    "whatsapp": { "enabled": false }
  },
  "plugins": {
    "entries": {
      "telegram": { "enabled": true },
      "memory-lancedb": {
        "enabled": true,
        "config": {
          "embedding": {
            "token": "${GEMINI_API_KEY}",
            "model": "text-embedding-004"
          },
          "autoCapture": true,
          "autoRecall": true
        }
      }
    }
  }
}
EYE

echo "✅ Config stabilized."
