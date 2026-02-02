const { spawn } = require('child_process');
const child = spawn('node', ['/app/node_modules/clawdbot/dist/entry.js', 'gateway', '--port', '18789', '--allow-unconfigured']);

child.stdout.on('data', (data) => console.log(`STDOUT: ${data}`));
child.stderr.on('data', (data) => console.log(`STDERR: ${data}`));

setTimeout(() => {
  child.kill();
  process.exit(0);
}, 25000);
