const fs = require('fs');
const path = '/root/.clawdbot/config/clawdbot.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));
console.log(JSON.stringify(config.plugins?.entries?.['memory-lancedb']?.config?.embedding, null, 2));
