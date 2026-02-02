const https = require('https');
const token = '8303141982:AAGJPHhikj_bnKYl1DOeDHxY89vxRhrr8Ok';
const url = "https://api.telegram.org/bot" + token + "/getMe";

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    process.stdout.write('TG_VERIFY: ' + data + '\n');
  });
}).on('error', (err) => {
  process.stderr.write('TG_ERROR: ' + err.message + '\n');
});
