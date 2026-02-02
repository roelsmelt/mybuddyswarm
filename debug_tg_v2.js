const fs = require('fs');
const path = '/root/.clawdbot/config/clawdbot.json';

try {
  const config = JSON.parse(fs.readFileSync(path, 'utf8'));
  console.log('--- Config Check ---');
  console.log('Telegram Enabled:', config.channels?.telegram?.enabled);
  console.log('Bot Token Prefix:', config.channels?.telegram?.botToken?.substring(0, 10));
  console.log('Admin ID:', config.env.TELEGRAM_ADMIN_ID);
} catch (e) {
  console.error('Error reading config:', e.message);
}

const logPaths = [
  '/root/.clawdbot/gateway.log',
  '/root/.clawdbot/clawdbot.log',
  '/root/gateway.log'
];

logPaths.forEach(lp => {
  try {
    const log = fs.readFileSync(lp, 'utf8');
    console.log(`--- End of ${lp} ---`);
    console.log(log.split('\n').slice(-50).join('\n'));
  } catch (e) {
    console.log(`Could not read ${lp}`);
  }
});

const files = fs.readdirSync('/root/.clawdbot');
console.log('--- .clawdbot Contents ---');
console.log(files);
