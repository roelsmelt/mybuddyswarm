const fs = require('fs');
const path = '/root/.clawdbot/workspace/USER.md';
try {
  const content = fs.readFileSync(path, 'utf8');
  console.log('USER.MD CONTENT CHECK:');
  console.log(content.split('\n').slice(0, 15).join('\n'));
} catch (e) {
  console.log('USER.MD NOT FOUND AT', path);
}
