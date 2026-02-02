#!/bin/bash
set -e

ROLE=${ROLE:-buddy}
echo "🐝 Starting MyBuddyTalk Gateway..."
echo " -> Role: $ROLE"

# Default Home Directory (mounted volume - must match fly.toml mount)
export CLAWDBOT_HOME="/root/.clawdbot"
mkdir -p "$CLAWDBOT_HOME/config"
mkdir -p "$CLAWDBOT_HOME/agents/main/sessions"

# Ensure dir exists
mkdir -p "$CLAWDBOT_HOME"

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

# STATE CLEANSE: Force any migrated agent state to Gemini
echo " -> [CLEANSE] Purging Anthropic preferences from agent state..."
if [ -d "$CLAWDBOT_HOME/agents" ]; then
    find "$CLAWDBOT_HOME/agents" -name "*.json" -exec sed -i 's/anthropic/google/g' {} +
    find "$CLAWDBOT_HOME/agents" -name "*.json" -exec sed -i 's/claude-[^"]*/gemini-1.5-pro/g' {} +
fi

bootstrap_config() {
    # Delete BOTH potential config locations to ensure no shadow config survives
    rm -f "$CLAWDBOT_HOME/clawdbot.json"
    rm -f "$CLAWDBOT_HOME/config/clawdbot.json"
    
    CONFIG_PATH="$CLAWDBOT_HOME/clawdbot.json"
    echo " -> Forced fresh generation. Writing bootstrap to $CONFIG_PATH..."

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
    mkdir -p "$CLAWDBOT_HOME/config"
    cat <<EOF > "$CONFIG_PATH"
{
  "env": {
    "GEMINI_API_KEY": "${GEMINI_API_KEY}",
    "BRAVE_API_KEY": "${BRAVE_API_KEY}",
    "FLY_API_TOKEN": "${FLY_API_TOKEN}",
    "GOG_ACCOUNT": "rulerulez@gmail.com",
    "CLAWDBOT_TELEGRAM_TOKEN": "${CLAWDBOT_TELEGRAM_TOKEN}",
    "TELEGRAM_BOT_TOKEN": "${CLAWDBOT_TELEGRAM_TOKEN}",
    "TELEGRAM_ADMIN_ID": "${TELEGRAM_ADMIN_ID}",
    "ADMIN_ID": "${TELEGRAM_ADMIN_ID}"
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
    },
    "whatsapp": {
      "sendReadReceipts": true,
      "dmPolicy": "allowlist",
      "allowFrom": [
        "+31654377400"
      ],
      "groupPolicy": "allowlist",
      "mediaMaxMb": 50,
      "debounceMs": 0
    }
  },
  "plugins": {
    "slots": {
      "memory": "memory-lancedb"
    },
    "entries": {
      "telegram": {
        "enabled": true
      },
      "whatsapp": {
        "enabled": true
      },
      "memory-lancedb": {
        "enabled": true,
        "config": {
          "embedding": {
            "apiKey": "${GEMINI_API_KEY}",
            "model": "text-embedding-004"
          },
          "autoCapture": true,
          "autoRecall": true,
          "embedding": {
            "provider": "google",
            "model": "text-embedding-004"
          }
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

# DOCTOR: Fix any schema issues automatically
echo " -> [DOCTOR] Repairing configuration schema..."
node /app/node_modules/clawdbot/dist/entry.js doctor --fix || true

# Start Gateway
# Using node directly for better signal handling and log forwarding
BINARY="/app/node_modules/clawdbot/dist/entry.js"

echo " -> [DIAGNOSTIC] Current configuration:"
cat "$CLAWDBOT_HOME/clawdbot.json"

# Start Gateway - bind to LAN for Fly.io proxy with auto-generated token
GATEWAY_TOKEN="${CLAWDBOT_GATEWAY_TOKEN:-$(openssl rand -hex 16)}"
export CLAWDBOT_GATEWAY_TOKEN="$GATEWAY_TOKEN"
CMD="node $BINARY gateway --port 18789 --bind lan --token $GATEWAY_TOKEN --allow-unconfigured"

echo " -> Executing: $CMD"
exec $CMD
