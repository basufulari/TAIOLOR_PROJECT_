const mongoose = require('mongoose');
const User = require('../models/User');
const { ADMIN_ACCOUNT } = require('../config/adminAccount');

const useMongo = () => mongoose.connection.readyState === 1;

async function ensureAdminUser() {
  if (!useMongo()) return;

  const norm = ADMIN_ACCOUNT.email.toLowerCase();
  try {
    let user = await User.findOne({ email: norm });
    if (!user) {
      user = await User.create({
        name: ADMIN_ACCOUNT.name,
        email: norm,
        password: ADMIN_ACCOUNT.password,
        phone: ADMIN_ACCOUNT.phone,
        role: 'admin',
      });
      console.log(`Admin user created (mongodb): ${norm}`);
      return;
    }
    user.role = 'admin';
    user.password = ADMIN_ACCOUNT.password;
    await user.save();
    if (user.isModified('password') || user.isModified('role')) {
      console.log(`Admin user ready: ${norm}`);
    }
  } catch (e) {
    console.warn(`Admin user ${norm}:`, e.message);
  }
}

module.exports = ensureAdminUser;
