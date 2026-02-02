const fs = require('fs');
const path = '/root/.clawdbot/config/clawdbot.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));

// The configuration is being rejected because of 'Wizard' or other extra keys.
// Let's use the most PRIMITIVE configuration possible.
const primitive = {
  env: {
    GEMINI_API_KEY: config.env.GEMINI_API_KEY,
    ANTHROPIC_API_KEY: config.env.ANTHROPIC_API_KEY,
    BRAVE_API_KEY: config.env.BRAVE_API_KEY,
    TELEGRAM_BOT_TOKEN: config.env.TELEGRAM_BOT_TOKEN || config.env.CLAWDBOT_TELEGRAM_TOKEN,
    TELEGRAM_ADMIN_ID: 6528670828,
    GOG_ACCOUNT: "rulerulez@gmail.com"
  },
  agents: {
    defaults: {
      model: {
        primary: "google/gemini-1.5-flash"
      }
    }
  },
  channels: {
    telegram: {
      enabled: true,
      botToken: config.env.TELEGRAM_BOT_TOKEN || config.env.CLAWDBOT_TELEGRAM_TOKEN,
      dmPolicy: "pairing",
      streamMode: "partial"
    }
  },
  plugins: {
    entries: {
      "telegram": { enabled: true }
    }
  }
};

fs.writeFileSync(path, JSON.stringify(primitive, null, 2));
console.log('PRIMITIVE CONFIG WRITTEN');
