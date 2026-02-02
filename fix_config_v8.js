const fs = require('fs');
const path = '/root/.clawdbot/config/clawdbot.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));

// The engine is still picking up WhatsApp and other things because of local/default merging.
// We need to EXPLICITLY disable them in the config if we don't want them yet,
// OR accept that they are running and verify stability.
// Since we are in a loop, let's shut down everything EXCEPT Telegram.

config.channels = {
  telegram: {
    enabled: true,
    botToken: config.env.TELEGRAM_BOT_TOKEN || config.env.CLAWDBOT_TELEGRAM_TOKEN,
    dmPolicy: "pairing"
  },
  whatsapp: { enabled: false }
};

config.plugins = {
  entries: {
    telegram: { enabled: true }
  }
};

fs.writeFileSync(path, JSON.stringify(config, null, 2));
console.log('Explicitly disabled WhatsApp to stop conflict');
