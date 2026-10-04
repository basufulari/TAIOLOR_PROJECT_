const path = require('path');
// Always load backend/.env even if started from another folder.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const dns = require('dns');
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const ensureAdminUser = require('./store/ensureAdminUser');
const adminRoutes = require('./routes/admin');

dns.setDefaultResultOrder('ipv4first');

const authRoutes = require('./routes/auth');
const measurementRoutes = require('./routes/measurements');
const designRoutes = require('./routes/designs');
const orderRoutes = require('./routes/orders');
const tryonRoutes = require('./routes/tryon');
const notificationRoutes = require('./routes/notifications');
const canvasRoutes = require('./routes/canvas');
const customerRoutes = require('./routes/customers');
const paymentRoutes = require('./routes/payments');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET', 'POST'] },
});

app.set('io', io);

io.on('connection', (socket) => {
  socket.on('joinUser', (userId) => socket.join(`user:${userId}`));
  socket.on('joinOrder', (orderId) => socket.join(`order:${orderId}`));
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
app.use('/uploads', express.static(path.join(__dirname, '..', uploadDir)));

app.get('/health', (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  res.json({
    success: true,
    service: 'ai-tailor-api',
    status: 'ok',
    mongodb: mongo ? 'connected' : 'disconnected',
    authStorage: mongo ? 'mongodb' : 'file (backend/data/users.json)',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tryon', tryonRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/canvas', canvasRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

async function seedDesignsIfEmpty() {
  if (mongoose.connection.readyState !== 1) return;
  const Design = require('./models/Design');
  if ((await Design.countDocuments()) > 0) return;
  const samples = [
    { title: 'Classic White Shirt', category: 'shirt', fabricType: 'Cotton', price: 1200, imageUrl: 'https://picsum.photos/seed/shirt1/400/500', isPublic: true },
    { title: 'Navy Formal Suit', category: 'suit', fabricType: 'Wool', price: 8500, imageUrl: 'https://picsum.photos/seed/suit1/400/500', isPublic: true },
    { title: 'Casual Kurta', category: 'kurta', fabricType: 'Linen', price: 1800, imageUrl: 'https://picsum.photos/seed/kurta1/400/500', isPublic: true },
    { title: 'Slim Trousers', category: 'pants', fabricType: 'Cotton', price: 1400, imageUrl: 'https://picsum.photos/seed/pants1/400/500', isPublic: true },
  ];
  await Design.insertMany(samples);
  console.log(`Auto-seeded ${samples.length} designs`);
}

const start = async () => {
  await connectDB();
  await ensureAdminUser();
  await seedDesignsIfEmpty();

  try {
    const { isAiOnline } = require('./services/aiClient');
    const online = await isAiOnline();
    if (online) {
      console.log('  AI     → http://localhost:8000 (ready)');
    } else {
      console.warn('  AI     → offline — run .\\start-ai.ps1 (measurements use fallback until then)');
    }
  } catch {
    console.warn('  AI     → offline — run .\\start-ai.ps1');
  }
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nPort ${PORT} already in use. Run:`);
      console.error(`  Get-NetTCPConnection -LocalPort ${PORT} | %% { Stop-Process -Id $_.OwningProcess -Force }`);
      console.error('Or close the other backend terminal.\n');
    }
    process.exit(1);
  });

  server.listen(PORT, () => {
    console.log(`\n✓ API ready → http://localhost:${PORT}`);
    console.log(`  Health → http://localhost:${PORT}/health`);
    console.log(`  Auth   → http://localhost:${PORT}/api/auth/status`);
    console.log(`  Canvas → http://localhost:${PORT}/api/canvas/analyze`);
    console.log(`  Register tailor or sign in (admin account configured)\n`);
  });
};

start().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
