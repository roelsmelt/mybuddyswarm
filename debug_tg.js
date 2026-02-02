const fs = require('fs');
const path = '/root/.clawdbot/config/clawdbot.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));

console.log('--- Config Check ---');
console.log('Telegram Enabled:', config.channels?.telegram?.enabled);
console.log('Bot Token Prefix:', config.channels?.telegram?.botToken?.substring(0, 10));
console.log('Admin ID:', config.env.TELEGRAM_ADMIN_ID);
console.log('DM Policy:', config.channels?.telegram?.dmPolicy);

// Check if there are any other config files that might be overriding
const files = fs.readdirSync('/root/.clawdbot/config');
console.log('Config files:', files);

// Check logs
try {
  const log = fs.readFileSync('/root/.clawdbot/gateway.log', 'utf8');
  console.log('--- End of Gateway Log ---');
  console.log(log.split('\n').slice(-30).join('\n'));
} catch (e) {
  console.log('Could not read gateway.log');
}
