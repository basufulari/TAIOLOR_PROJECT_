const express = require('express');
const Customer = require('../models/Customer');
const Measurement = require('../models/Measurement');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');
const requireMongo = require('../middleware/requireMongo');
const { getUserId } = require('../utils/userId');
const { formatMeasurement } = require('../utils/measurementFormat');

const router = express.Router();

router.get('/', protect, authorize('tailor', 'admin'), requireMongo, async (req, res) => {
  const customers = await Customer.find({ tailor: getUserId(req.user) })
    .sort({ updatedAt: -1 })
    .limit(200);
  res.json({ success: true, customers });
});

/** All customers with measurement summary for tailor records */
router.get('/records', protect, authorize('tailor', 'admin'), requireMongo, async (req, res) => {
  const tailorId = getUserId(req.user);
  const customers = await Customer.find({ tailor: tailorId })
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  if (customers.length === 0) {
    return res.json({ success: true, customers: [] });
  }

  const ids = customers.map((c) => c._id);

  const [measGroups, orderGroups] = await Promise.all([
    Measurement.aggregate([
      { $match: { customer: { $in: ids }, user: tailorId } },
      { $sort: { isPrimary: -1, createdAt: -1 } },
      {
        $group: {
          _id: '$customer',
          count: { $sum: 1 },
          latest: { $first: '$$ROOT' },
        },
      },
    ]),
    Order.aggregate([
      { $match: { shopCustomer: { $in: ids }, tailor: tailorId } },
      { $group: { _id: '$shopCustomer', count: { $sum: 1 } } },
    ]),
  ]);

  const measMap = Object.fromEntries(measGroups.map((g) => [String(g._id), g]));
  const orderMap = Object.fromEntries(orderGroups.map((g) => [String(g._id), g.count]));

  const records = customers.map((c) => {
    const mg = measMap[String(c._id)];
    return {
      ...c,
      measurementCount: mg?.count || 0,
      orderCount: orderMap[String(c._id)] || 0,
      latestMeasurement: mg?.latest ? formatMeasurement(mg.latest) : null,
    };
  });

  res.json({ success: true, customers: records });
});

/** Full customer profile: contact info, all measurements, orders */
router.get('/:id', protect, authorize('tailor', 'admin'), requireMongo, async (req, res) => {
  const tailorId = getUserId(req.user);
  const customer = await Customer.findOne({ _id: req.params.id, tailor: tailorId }).lean();
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  const [measurements, orders] = await Promise.all([
    Measurement.find({ customer: customer._id, user: tailorId }).sort({ createdAt: -1 }).lean(),
    Order.find({ shopCustomer: customer._id, tailor: tailorId })
      .sort({ createdAt: -1 })
      .select('orderNumber garmentType status progressPercent createdAt updatedAt measurements fabricDetails')
      .populate('measurements', 'chest waist height shoulder sleeveLength isPrimary createdAt')
      .lean(),
  ]);

  res.json({
    success: true,
    customer,
    measurements: measurements.map(formatMeasurement),
    orders,
    stats: {
      measurementCount: measurements.length,
      orderCount: orders.length,
      hasPrimary: measurements.some((m) => m.isPrimary),
    },
  });
});

router.post('/', protect, authorize('tailor', 'admin'), requireMongo, async (req, res) => {
  const { name, phone, email, address, notes } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: 'Customer name required' });
  }
  const customer = await Customer.create({
    tailor: getUserId(req.user),
    name: name.trim(),
    phone: phone?.trim(),
    email: email?.trim()?.toLowerCase(),
    address: address?.trim(),
    notes: notes?.trim(),
  });
  res.status(201).json({ success: true, customer });
});

module.exports = router;
