const fs = require('fs');
const path = '/root/.clawdbot/config/clawdbot.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));
if (config.plugins?.entries?.['memory-lancedb']?.config?.embedding) {
  const emb = config.plugins.entries['memory-lancedb'].config.embedding;
  if (emb.apiKey) emb.token = emb.apiKey;
  delete emb.apiKey;
  delete emb.baseURL;
  console.log('Fixed embedding config');
}
fs.writeFileSync(path, JSON.stringify(config, null, 2));
