/**
 * Run: node scripts/check-atlas.js
 * Tries several Atlas connection formats (SRV often fails on some networks).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const dns = require('dns');
const mongoose = require('mongoose');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

function buildUris() {
  const user = encodeURIComponent(process.env.ATLAS_USER || '');
  const pass = encodeURIComponent(process.env.ATLAS_PASSWORD || '');
  const cluster = process.env.ATLAS_CLUSTER || 'cluster0.bxyza94.mongodb.net';
  const db = process.env.ATLAS_DB || 'ai_tailor';

  const list = [];

  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('<')) {
    list.push({ label: 'MONGODB_URI from .env', uri: process.env.MONGODB_URI });
  }

  list.push(
    {
      label: 'Standard (port 27017, no SRV)',
      uri: `mongodb://${user}:${pass}@${cluster}:27017/${db}?ssl=true&authSource=admin&directConnection=true&retryWrites=true&w=majority`,
    },
    {
      label: 'SRV (mongodb+srv)',
      uri: `mongodb+srv://${user}:${pass}@${cluster}/${db}?retryWrites=true&w=majority&appName=Cluster0`,
    },
    {
      label: 'Standard + tlsAllowInvalidCertificates (dev only)',
      uri: `mongodb://${user}:${pass}@${cluster}:27017/${db}?ssl=true&tlsAllowInvalidCertificates=true&authSource=admin&directConnection=true`,
    }
  );

  return list;
}

async function tryUri({ label, uri }) {
  const safe = uri.replace(/:([^:@/]+)@/, ':****@');
  console.log(`\nTrying: ${label}`);
  console.log(`  ${safe}`);

  await mongoose.disconnect().catch(() => {});

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 12000,
    family: 4,
  });

  console.log('  ✓ SUCCESS');
  return true;
}

async function main() {
  const uris = buildUris();
  console.log('Atlas connection test');
  console.log('User:', process.env.ATLAS_USER);
  console.log('Cluster:', process.env.ATLAS_CLUSTER);
  console.log('Network Access should include: 0.0.0.0/0 (Active)\n');

  let lastErr;

  for (const entry of uris) {
    try {
      if (await tryUri(entry)) {
        console.log('\n✓ Connected:', mongoose.connection.host);
        console.log('✓ Database:', mongoose.connection.name);

        const cols = await mongoose.connection.db.listCollections().toArray();
        console.log('\nCollections:', cols.length ? cols.map((c) => c.name).join(', ') : '(none — register in app)');

        console.log('\n→ Put this working URI in backend/.env as MONGODB_URI');
        console.log(entry.uri.replace(process.env.ATLAS_PASSWORD, '****'));

        await mongoose.disconnect();
        process.exit(0);
      }
    } catch (err) {
      lastErr = err;
      console.log('  ✗', err.message.split('\n')[0]);
    }
  }

  console.error('\n✗ All connection methods failed.');
  console.error('Last error:', lastErr?.message);

  console.error('\n--- Checklist ---');
  console.error('1. Atlas → Network Access → 0.0.0.0/0 Active (same PROJECT as cluster)');
  console.error(`2. Atlas → Database Access → user ${process.env.ATLAS_USER || 'your_db_user'} + password correct`);
  console.error('3. Atlas → Database → cluster NOT paused');
  console.error('4. Copy EXACT string: Database → Connect → Drivers → Node.js → paste into MONGODB_URI');
  console.error('5. Turn off VPN; try phone hotspot');
  console.error('6. Windows Firewall → allow Node.js');

  process.exit(1);
}

main();
