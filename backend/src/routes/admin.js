const express = require('express');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Measurement = require('../models/Measurement');
const Order = require('../models/Order');
const Design = require('../models/Design');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');
const requireMongo = require('../middleware/requireMongo');

const router = express.Router();

router.use(protect, authorize('admin'), requireMongo);

router.get('/dashboard', async (_req, res) => {
  const [users, customers, measurements, orders, designs, notifications] = await Promise.all([
    User.countDocuments(),
    Customer.countDocuments(),
    Measurement.countDocuments(),
    Order.countDocuments(),
    Design.countDocuments(),
    Notification.countDocuments(),
  ]);

  const tailors = await User.countDocuments({ role: 'tailor' });
  const activeOrders = await Order.countDocuments({
    status: { $nin: ['delivered', 'cancelled'] },
  });

  res.json({
    success: true,
    stats: {
      users,
      tailors,
      customers,
      measurements,
      orders,
      activeOrders,
      designs,
      notifications,
    },
    database: 'ai_tailor',
  });
});

router.get('/data', async (_req, res) => {
  const limit = 80;

  const [users, customers, measurements, orders, designs, notifications] = await Promise.all([
    User.find().select('-password').sort({ createdAt: -1 }).limit(limit).lean(),
    Customer.find().populate('tailor', 'name email').sort({ updatedAt: -1 }).limit(limit).lean(),
    Measurement.find()
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Order.find()
      .populate('shopCustomer', 'name phone')
      .populate('tailor', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Design.find().populate('uploadedBy', 'name email').sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.find().sort({ createdAt: -1 }).limit(limit).lean(),
  ]);

  res.json({
    success: true,
    users,
    customers,
    measurements,
    orders,
    designs,
    notifications,
  });
});

module.exports = router;
