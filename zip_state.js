const { execSync } = require('child_process');
try {
  execSync('tar -czf /root/state_debug.tar.gz -C /root/.clawdbot .');
  console.log('Archive created successfully');
} catch (e) {
  console.error('Failed to create archive:', e.message);
}
