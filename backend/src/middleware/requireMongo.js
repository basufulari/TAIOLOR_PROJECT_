const mongoose = require('mongoose');

const requireMongo = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'MongoDB Atlas required. Check backend/.env and restart API.',
      code: 'MONGODB_REQUIRED',
    });
  }
  next();
};

module.exports = requireMongo;
