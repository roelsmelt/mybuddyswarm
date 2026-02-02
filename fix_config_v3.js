const fs = require('fs');
const path = '/root/.clawdbot/config/clawdbot.json';
let config = JSON.parse(fs.readFileSync(path, 'utf8'));

// Fix memory-lancedb config to be super minimal
if (config.plugins?.entries?.['memory-lancedb']) {
  config.plugins.entries['memory-lancedb'].config = {
    embedding: {
      provider: "google",
      model: "text-embedding-004",
      token: config.env.GEMINI_API_KEY
    },
    autoCapture: true,
    autoRecall: true
  };
}

// Remove suspicious entries
if (config.agents?.defaults?.model?.fallbacks) {
  config.agents.defaults.model.fallbacks = [
    "anthropic/claude-3-5-sonnet-latest",
    "anthropic/claude-3-5-haiku-latest"
  ];
}

fs.writeFileSync(path, JSON.stringify(config, null, 2));
console.log('Final config fix applied');
