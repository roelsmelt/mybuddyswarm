#!/bin/bash
set -e

ROLE=${ROLE:-buddy}
echo "🐝 Starting MyBuddyTalk Gateway..."
echo " -> Role: $ROLE"

# Default Home Directory (mounted volume - must match fly.toml mount)
export CLAWDBOT_HOME="/root/.clawdbot"
mkdir -p "$CLAWDBOT_HOME/agents/main/sessions"

# Legacy/Ecosystem Variables
export TELEGRAM_BOT_TOKEN="${CLAWDBOT_TELEGRAM_TOKEN}"
export TELEGRAM_ADMIN_ID="${TELEGRAM_ADMIN_ID}"
export ADMIN_ID="${TELEGRAM_ADMIN_ID}"

# Enable Standard Debug Logging
export DEBUG="clawdbot:*"

# Force cleanup of any stale processes or lockfiles
echo " -> Cleaning up stale processes and session data..."
pkill -9 clawdbot || true
pkill -9 node || true
rm -f "$CLAWDBOT_HOME/.lock" 2>/dev/null || true
# Clean up stale session locks from migration
rm -rf "$CLAWDBOT_HOME/credentials/telegram" 2>/dev/null || true
rm -rf "$CLAWDBOT_HOME/credentials/pairing" 2>/dev/null || true

# Ensure correct ownership for migrated files (fix for UID 501 issue)
echo " -> Fixing file ownership..."
chown -R root:root "$CLAWDBOT_HOME" || true

# SECURITY: Explicitly unset Anthropic key to prevent ANY accidental usage
unset ANTHROPIC_API_KEY

bootstrap_config() {
    CONFIG_PATH="$CLAWDBOT_HOME/clawdbot.json"
    
    # Preserve existing config - only bootstrap if missing
    if [ -f "$CONFIG_PATH" ]; then
        echo " -> Existing configuration found. Preserving..."
        return 0
    fi

    # Dynamic Model Discovery (Gemini 3.0 / Smart Fallback)
    echo " -> [SMART] Discovering latest Gemini models..."
    MODEL_JSON=$(python3 /app/discover_models.py)
    
    # Primitieve JSON parsing met grep/sed omdat jq misschien niet aanwezig is
    # We verwachten {"high": "...", "low": "..."}
    GEMINI_LOW=$(echo $MODEL_JSON | grep -o '"low": "[^"]*"' | cut -d'"' -f4)
    GEMINI_HIGH=$(echo $MODEL_JSON | grep -o '"high": "[^"]*"' | cut -d'"' -f4)
    
    # Fallback als parsing faalt
    if [ -z "$GEMINI_LOW" ]; then GEMINI_LOW="google/gemini-1.5-flash"; fi
    if [ -z "$GEMINI_HIGH" ]; then GEMINI_HIGH="google/gemini-1.5-pro"; fi
    
    echo " -> [SMART] Selected Low-Tier (Primary): $GEMINI_LOW"
    echo " -> [SMART] Selected High-Tier (Fallback): $GEMINI_HIGH"

    echo " -> No configuration found. Writing initial bootstrap to $CONFIG_PATH..."
    cat <<EOF > "$CONFIG_PATH"
{
  "env": {
    "GEMINI_API_KEY": "${GEMINI_API_KEY}",
    "BRAVE_API_KEY": "${BRAVE_API_KEY}",
    "FLY_API_TOKEN": "${FLY_API_TOKEN}",
    "GOG_ACCOUNT": "rulerulez@gmail.com",
    "CLAWDBOT_TELEGRAM_TOKEN": "${CLAWDBOT_TELEGRAM_TOKEN}",
    "TELEGRAM_BOT_TOKEN": "${CLAWDBOT_TELEGRAM_TOKEN}",
    "TELEGRAM_ADMIN_ID": ${TELEGRAM_ADMIN_ID},
    "ADMIN_ID": ${TELEGRAM_ADMIN_ID}
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "$GEMINI_LOW",
        "fallbacks": [
            "$GEMINI_HIGH"
        ]
      }
    }
  },
  "channels": {
    "telegram": {
      "botToken": "${CLAWDBOT_TELEGRAM_TOKEN}",
      "dmPolicy": "pairing",
      "groupPolicy": "allowlist",
      "streamMode": "partial"
    }
  },
  "plugins": {
    "entries": {
      "telegram": {
        "enabled": true
      },
      "memory-lancedb": {
        "enabled": true,
        "config": {
          "autoCapture": true,
          "autoRecall": true
        }
      }
    }
  }
}
EOF
}

echo " -> Environment context:"
env | grep GOG_ || true
env | grep CLAWDBOT_ || true
env | grep TELEGRAM_ || true

bootstrap_config

# Start Gateway
# Using node directly for better signal handling and log forwarding
BINARY="/app/node_modules/clawdbot/dist/entry.js"

echo " -> [DIAGNOSTIC] Current configuration:"
cat "$CLAWDBOT_HOME/clawdbot.json"

# Start Gateway
CMD="node $BINARY gateway --port 18789 --allow-unconfigured"

echo " -> Executing: $CMD"
exec $CMD
