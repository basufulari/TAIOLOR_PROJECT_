const mongoose = require('mongoose');
const User = require('../models/User');
const fileUsers = require('./fileUsers');
const { DUMMY_ACCOUNTS } = require('../config/dummyAccounts');

const useMongo = () => mongoose.connection.readyState === 1;

async function ensureDummyUsers() {
  for (const acc of Object.values(DUMMY_ACCOUNTS)) {
    const norm = acc.email.toLowerCase();
    try {
      if (useMongo()) {
        const exists = await User.findOne({ email: norm });
        if (!exists) {
          await User.create({ ...acc, email: norm });
          console.log(`Dummy user created (mongodb): ${norm}`);
        }
      } else {
        const exists = await fileUsers.findByEmail(norm);
        if (!exists) {
          await fileUsers.create(acc);
          console.log(`Dummy user created (file): ${norm}`);
        }
      }
    } catch (e) {
      console.warn(`Dummy user ${norm}:`, e.message);
    }
  }
}

module.exports = ensureDummyUsers;
