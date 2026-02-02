const fs = require('fs');
const path = '/root/.clawdbot/config/clawdbot.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));

// The engine is crashing but not logging the reason to the gateway.log because it's failing at initialization.
// Let's ensure the memory plugin is EXPLICITLY disabled for now to isolate the core loop.
config.plugins = {
  entries: {
    "telegram": { enabled: true },
    "memory-lancedb": { enabled: false }
  }
};

fs.writeFileSync(path, JSON.stringify(cleanConfig || config, null, 2)); // Use config if cleanConfig is undefined
