const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const requireMongo = require('../middleware/requireMongo');
const { countOrdersForEmail } = require('../utils/customerOrders');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

const useMongo = () => mongoose.connection.readyState === 1;

const userPayload = (user) => ({
  id: String(user._id || user.id),
  _id: String(user._id || user.id),
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  address: user.address,
});

function normalizeLoginEmail(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return raw;
  if (raw.includes('@')) return raw;
  if (raw === 'basavaraj') return 'basavaraj@aitailor.com';
  return `${raw}@aitailor.com`;
}

router.get('/status', (_req, res) => {
  res.json({
    success: true,
    database: useMongo() ? 'mongodb' : 'disconnected',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    dbName: mongoose.connection.name || null,
    appMode: 'tailor-and-customer',
  });
});

router.post(
  '/register',
  requireMongo,
  [
    body('name').trim().notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('phone').optional().trim(),
    body('address').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, phone, address } = req.body;
    const normEmail = email.toLowerCase();

    try {
      if (await User.findOne({ email: normEmail })) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }
      const user = await User.create({
        name,
        email: normEmail,
        password,
        phone,
        address,
        role: 'tailor',
      });
      const token = signToken(user._id);
      return res.status(201).json({
        success: true,
        storage: 'mongodb',
        token,
        user: userPayload(user),
      });
    } catch (e) {
      console.error('Register error:', e);
      return res.status(500).json({ success: false, message: e.message });
    }
  }
);

router.post(
  '/customer/register',
  requireMongo,
  [
    body('name').trim().notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('phone').optional().trim(),
    body('address').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, phone, address } = req.body;
    const normEmail = email.toLowerCase();

    try {
      const existing = await User.findOne({ email: normEmail });
      if (existing) {
        return res.status(400).json({
          success: false,
          message:
            existing.role === 'customer'
              ? 'Email already registered — sign in instead'
              : 'This email is registered as a tailor account',
        });
      }

      const user = await User.create({
        name,
        email: normEmail,
        password,
        phone,
        address,
        role: 'customer',
      });

      const linkedOrders = await countOrdersForEmail(normEmail);
      const token = signToken(user._id);
      return res.status(201).json({
        success: true,
        token,
        user: userPayload(user),
        linkedOrders,
        message:
          linkedOrders > 0
            ? `Account created. ${linkedOrders} order(s) linked by email.`
            : 'Account created. Use the same email your tailor saved to see orders.',
      });
    } catch (e) {
      console.error('Customer register error:', e);
      return res.status(500).json({ success: false, message: e.message });
    }
  }
);

router.post(
  '/login',
  requireMongo,
  [body('email').trim().notEmpty(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const normEmail = normalizeLoginEmail(req.body.email);
    const wantRole = req.body.role === 'customer' ? 'customer' : 'tailor';

    try {
      const user = await User.findOne({ email: normEmail }).select('+password');
      if (!user || !(await user.comparePassword(req.body.password))) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      if (wantRole === 'customer') {
        if (user.role !== 'customer') {
          return res.status(403).json({
            success: false,
            message: 'Not a customer account. Register as customer or sign in as tailor.',
          });
        }
        const linkedOrders = await countOrdersForEmail(user.email);
        const token = signToken(user._id);
        return res.json({
          success: true,
          token,
          user: userPayload(user),
          linkedOrders,
        });
      }

      if (user.role !== 'tailor' && user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Customer account. Switch to Customer login or register as tailor.',
        });
      }

      const token = signToken(user._id);
      return res.json({
        success: true,
        storage: 'mongodb',
        token,
        user: userPayload(user),
      });
    } catch (e) {
      console.error('Login error:', e);
      return res.status(500).json({ success: false, message: e.message });
    }
  }
);

router.get('/me', protect, requireMongo, async (req, res) => {
  res.json({ success: true, user: userPayload(req.user) });
});

router.put('/fcm-token', protect, requireMongo, async (req, res) => {
  if (req.user.save) {
    req.user.fcmToken = req.body.fcmToken;
    await req.user.save();
  }
  res.json({ success: true });
});

module.exports = router;
