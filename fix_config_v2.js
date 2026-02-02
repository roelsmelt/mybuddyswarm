const fs = require('fs');
const path = '/root/.clawdbot/config/clawdbot.json';
let config;
try {
    config = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch (e) {
    console.error("Failed to read config:", e);
    process.exit(1);
}

if (config.plugins?.entries?.['memory-lancedb']?.config) {
  const c = config.plugins.entries['memory-lancedb'].config;
  if (c.embedding) {
    const token = c.embedding.apiKey || c.embedding.token;
    c.embedding = {
      provider: "google",
      model: "text-embedding-004",
      token: token
    };
    console.log('Reset embedding config to standard format');
  }
}

// Remove missing plugins to avoid noise
if (config.plugins?.entries) {
  delete config.plugins.entries.beekeeper;
  delete config.plugins.entries['swarm-manager'];
}

fs.writeFileSync(path, JSON.stringify(config, null, 2));
console.log('Wrote fixed config');
