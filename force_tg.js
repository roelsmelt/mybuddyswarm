const fs = require('fs');
const path = '/root/.clawdbot/config/clawdbot.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));

// Force Telegram to be the ONLY thing running to avoid any other crashes
const forced = {
  env: config.env,
  agents: config.agents,
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

fs.writeFileSync(path, JSON.stringify(forced, null, 2));
console.log('TELEGRAM FORCED ON');
