const fs = require('fs');
const path = '/root/.clawdbot/config/clawdbot.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));

// The engine seems to be merging from another source or ignoring the disable flag
// because of some internal logic. Let's try renaming the credentials directory
// to stop it from detecting the session entirely.

console.log('Cleaning up config to absolute bare minimum...');

const bare = {
  env: config.env,
  agents: { defaults: { model: { primary: "google/gemini-1.5-flash" } } },
  channels: {
    telegram: {
      enabled: true,
      botToken: config.env.TELEGRAM_BOT_TOKEN || config.env.CLAWDBOT_TELEGRAM_TOKEN,
      dmPolicy: "pairing"
    }
  },
  plugins: {
    entries: {
        telegram: { enabled: true }
    }
  }
};

fs.writeFileSync(path, JSON.stringify(bare, null, 2));
