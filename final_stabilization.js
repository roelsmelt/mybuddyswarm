const fs = require('fs');
const path = '/root/.clawdbot/config/clawdbot.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));

// Essential Environment
const env = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    BRAVE_API_KEY: process.env.BRAVE_API_KEY,
    TELEGRAM_BOT_TOKEN: process.env.CLAWDBOT_TELEGRAM_TOKEN,
    TELEGRAM_ADMIN_ID: 6528670828,
    GOG_ACCOUNT: "rulerulez@gmail.com"
};

// Stabilized Config
const stable = {
  env,
  agents: {
    defaults: {
      model: {
        primary: "google/gemini-1.5-flash",
        fallbacks: [
          "anthropic/claude-3-5-sonnet-latest",
          "anthropic/claude-3-5-haiku-latest"
        ]
      },
      compaction: {
        mode: "safeguard",
        reserveTokensFloor: 30000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000
        }
      }
    }
  },
  channels: {
    telegram: {
      enabled: true,
      botToken: env.TELEGRAM_BOT_TOKEN,
      dmPolicy: "pairing",
      streamMode: "partial"
    },
    whatsapp: { enabled: false }
  },
  plugins: {
    entries: {
      "telegram": { enabled: true },
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            token: env.GEMINI_API_KEY,
            model: "text-embedding-004"
          },
          autoCapture: true,
          autoRecall: true
        }
      }
    }
  }
};

fs.writeFileSync(path, JSON.stringify(stable, null, 2));
console.log('Stable config written with memory re-enabled');
