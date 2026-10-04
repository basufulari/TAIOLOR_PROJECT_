/** Run: node scripts/get-public-ip.js — add this IP in Atlas Network Access */
const https = require('https');

https
  .get('https://api.ipify.org?format=json', (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      const ip = JSON.parse(data).ip;
      console.log('\nYour public IP:', ip);
      console.log('\nIn Atlas → Network Access → ADD IP ADDRESS:');
      console.log('  IP:', ip);
      console.log('  (Keep 0.0.0.0/0 as well)\n');
    });
  })
  .on('error', () => console.log('Could not fetch IP. Use https://whatismyip.com in browser.'));
