const express = require('express');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');
const requireMongo = require('../middleware/requireMongo');
const { getUserId } = require('../utils/userId');

const router = express.Router();

router.get(
  '/',
  protect,
  authorize('tailor', 'admin', 'customer'),
  requireMongo,
  async (req, res) => {
    const notifications = await Notification.find({ user: getUserId(req.user) })
      .populate('order', 'orderNumber status progressPercent')
      .sort({ createdAt: -1 })
      .limit(80);
    const unread = notifications.filter((n) => !n.read).length;
    res.json({ success: true, notifications, unread });
  }
);

router.patch(
  '/read-all',
  protect,
  authorize('tailor', 'admin', 'customer'),
  requireMongo,
  async (req, res) => {
    await Notification.updateMany({ user: getUserId(req.user), read: false }, { read: true });
    res.json({ success: true });
  }
);

router.patch(
  '/:id/read',
  protect,
  authorize('tailor', 'admin', 'customer'),
  requireMongo,
  async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: getUserId(req.user) },
      { read: true },
      { new: true }
    );
    res.json({ success: true, notification });
  }
);

module.exports = router;
