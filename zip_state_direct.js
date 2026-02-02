const { execSync } = require('child_process');
const fs = require('fs');
try {
  // Use a more accessible temp path for the archive
  const archivePath = '/tmp/state_debug.tar.gz';
  if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
  
  execSync(`tar -czf ${archivePath} -C /root/.clawdbot .`);
  console.log(`SUCCESS: Archive created at ${archivePath}`);
} catch (e) {
  console.error('FAILED to create archive:', e.message);
}
