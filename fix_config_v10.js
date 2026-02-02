const fs = require('fs');
const path = '/root/.clawdbot/config/clawdbot.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));

// If it persists, it's because the gateway is running from a cached version or something.
// Let's check for ANY OTHER clawdbot.json on the system.
console.log('Final attempt at scrubbing config...');

const finalClean = {
  env: config.env,
  agents: { defaults: { model: { primary: "google/gemini-1.5-flash" } } },
  channels: {
    telegram: {
      enabled: true,
      botToken: config.env.TELEGRAM_BOT_TOKEN || config.env.CLAWDBOT_TELEGRAM_TOKEN,
      dmPolicy: "pairing"
    },
    whatsapp: { enabled: false }
  },
  plugins: {
    entries: {
        telegram: { enabled: true }
    }
  }
};

fs.writeFileSync(path, JSON.stringify(finalClean, null, 2));
