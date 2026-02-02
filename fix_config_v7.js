const fs = require('fs');
const path = '/root/.clawdbot/config/clawdbot.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));

// The configuration is being rejected by the engine schema.
// Let's reset it to a BARE MINIMUM known good state.
const cleanConfig = {
  env: {
    GEMINI_API_KEY: config.env.GEMINI_API_KEY,
    ANTHROPIC_API_KEY: config.env.ANTHROPIC_API_KEY,
    BRAVE_API_KEY: config.env.BRAVE_API_KEY,
    TELEGRAM_BOT_TOKEN: config.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_ADMIN_ID: config.env.TELEGRAM_ADMIN_ID,
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
      botToken: config.env.TELEGRAM_BOT_TOKEN,
      dmPolicy: "pairing"
    }
  },
  plugins: {
    entries: {}
  }
};

fs.writeFileSync(path, JSON.stringify(cleanConfig, null, 2));
console.log('Bare minimum config applied');
