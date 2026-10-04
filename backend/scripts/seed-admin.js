/**
 * Optional seed: node scripts/seed-admin.js
 * Creates admin@aitailor.com / admin123 (change in production)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  const email = 'admin@aitailor.com';
  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Admin already exists');
    process.exit(0);
  }
  await User.create({
    name: 'Admin',
    email,
    password: 'admin123',
    role: 'admin',
  });
  console.log('Admin created:', email, '/ admin123');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
