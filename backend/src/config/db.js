const mongoose = require('mongoose');
const dns = require('dns');
const https = require('https');

let memoryServer;
let isConnected = false;

// Windows often blocks SRV lookups on default DNS — use public DNS for Atlas
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

async function getPublicIp() {
  return new Promise((resolve) => {
    https
      .get('https://api.ipify.org?format=json', { timeout: 5000 }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body).ip);
          } catch {
            resolve(null);
          }
        });
      })
      .on('error', () => resolve(null));
  });
}

async function connectInMemory() {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create({ binary: { version: '6.0.6' } });
  await mongoose.connect(memoryServer.getUri());
  console.log('MongoDB: in-memory (local — data lost on restart)');
}

async function tryAtlas() {
  const user = encodeURIComponent(process.env.ATLAS_USER || '');
  const pass = encodeURIComponent(process.env.ATLAS_PASSWORD || '');
  const cluster = process.env.ATLAS_CLUSTER;
  const db = process.env.ATLAS_DB || 'ai_tailor';

  const uris = [];
  // Standard TCP first (works when SRV DNS is blocked)
  if (user && pass && cluster) {
    uris.push(
      `mongodb://${user}:${pass}@${cluster}:27017/${db}?ssl=true&authSource=admin&directConnection=true&retryWrites=true&w=majority`
    );
  }
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('<')) {
    uris.push(process.env.MONGODB_URI);
  }
  if (user && pass && cluster) {
    uris.push(`mongodb+srv://${user}:${pass}@${cluster}/${db}?retryWrites=true&w=majority`);
  }

  const tlsInsecure = process.env.MONGODB_TLS_INSECURE === 'true';
  const connectOpts = {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    socketTimeoutMS: 20000,
    family: 4,
  };
  if (tlsInsecure) {
    connectOpts.tlsAllowInvalidCertificates = true;
    console.warn('MONGODB_TLS_INSECURE=true (dev only — fixes Windows SSL cert errors)');
  }

  let lastErr = null;
  for (const uri of uris) {
    try {
      await mongoose.disconnect().catch(() => {});
      // Don't log credentials.
      const safeUri = uri.replace(/\/\/([^@]+)@/, '//***:***@');
      console.log('MongoDB: trying →', safeUri);
      await mongoose.connect(uri, connectOpts);
      console.log('MongoDB: Atlas connected →', mongoose.connection.host);
      return true;
    } catch (e) {
      lastErr = e;
      const msg = e.message || '';
      const certErr =
        msg.includes('certificate') || msg.includes('TLS') || msg.includes('SSL');
      if (certErr && !tlsInsecure) {
        console.warn('Atlas TLS error (common on Windows). Retrying with MONGODB_TLS_INSECURE...');
        connectOpts.tlsAllowInvalidCertificates = true;
      }
    }
  }
  if (lastErr) {
    const msg = lastErr.message || '';
    console.warn('Atlas last error:', msg);
    if (msg.includes('bad auth') || msg.includes('Authentication failed')) {
      console.error('Wrong username/password in .env — reset in Atlas → Database Access → Edit user');
    }
  }
  return false;
}

const connectDB = async () => {
  mongoose.set('strictQuery', true);

  if (process.env.USE_IN_MEMORY_DB === 'true') {
    try {
      await connectInMemory();
      isConnected = true;
      return;
    } catch (e) {
      console.warn('In-memory Mongo failed:', e.message);
      return;
    }
  }

  const atlasOk = await tryAtlas();
  if (atlasOk) {
    isConnected = true;
    return;
  }

  const ip = await getPublicIp();
  console.error('\n--- MongoDB Atlas connection failed ---');
  if (ip) {
    console.error(`Add this IP in Atlas → Network Access → Add IP: ${ip}`);
  }
  console.error('Or allow 0.0.0.0/0 (dev only). Same project as your cluster.');
  console.error('Verify Database Access user/password match backend/.env');
  console.error('Copy fresh URI: Atlas → Connect → Drivers → Node.js\n');

  const allowFallback =
    process.env.FALLBACK_MEMORY_ON_FAIL === 'true' ||
    (process.env.NODE_ENV || 'development') !== 'production';

  if (allowFallback) {
    console.warn(
      'MongoDB: Atlas unavailable → using in-memory DB (dev fallback). Set USE_IN_MEMORY_DB=true or fix Atlas for persistence.\n'
    );
    await connectInMemory();
    isConnected = true;
    return;
  }

  console.error('Set FALLBACK_MEMORY_ON_FAIL=true in .env to start API while fixing Atlas.');
  process.exit(1);
};

const isDbConnected = () => isConnected && mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.isDbConnected = isDbConnected;
