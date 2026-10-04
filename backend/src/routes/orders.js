const express = require('express');
const path = require('path');
const fs = require('fs');
const Order = require('../models/Order');
const Measurement = require('../models/Measurement');
const Design = require('../models/Design');
const Customer = require('../models/Customer');
const { protect, authorize } = require('../middleware/auth');
const requireMongo = require('../middleware/requireMongo');
const { upload } = require('../middleware/upload');
const { recommendSize } = require('../services/aiClient');
const { createNotification } = require('../utils/notifications');
const { getUserId } = require('../utils/userId');
const {
  normalizeEmail,
  findOrdersForCustomerUser,
  findCustomerOrderById,
  notifyCustomerForOrder,
} = require('../utils/customerOrders');
const {
  derivePaymentStatus,
  generateReceiptNumber,
  attachReceiptToOrder,
} = require('../utils/paymentReceipt');
const User = require('../models/User');

const router = express.Router();

const PROGRESS_MAP = {
  placed: 5,
  measurements_confirmed: 15,
  cutting: 30,
  stitching: 55,
  fitting: 75,
  quality_check: 90,
  ready: 100,
  delivered: 100,
  cancelled: 0,
};

router.post(
  '/',
  protect,
  authorize('tailor', 'admin'),
  requireMongo,
  upload.fields([
    { name: 'bodyPhoto', maxCount: 1 },
    { name: 'customDesign', maxCount: 1 },
  ]),
  async (req, res) => {
    const {
      designId,
      garmentType,
      fabricDetails,
      notes,
      measurementId,
      totalAmount,
      amountPaid,
      paymentMethod,
      paymentNotes,
      paymentStatus,
      customerId,
    } = req.body;

    const tailorId = getUserId(req.user);
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Select a customer for this order' });
    }

    const shopCustomer = await Customer.findOne({ _id: customerId, tailor: tailorId });
    if (!shopCustomer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    let measurements = null;
    if (measurementId) {
      measurements = await Measurement.findOne({
        _id: measurementId,
        user: tailorId,
        customer: customerId,
      });
    } else {
      measurements = await Measurement.findOne({
        user: tailorId,
        customer: customerId,
        isPrimary: true,
      }).sort({ createdAt: -1 });
    }

    let sizeRecommendation = null;
    if (measurements) {
      try {
        sizeRecommendation = await recommendSize(
          {
            chest: measurements.chest,
            waist: measurements.waist,
            shoulder: measurements.shoulder,
            sleeve_length: measurements.sleeveLength,
            height: measurements.height,
          },
          garmentType || 'shirt'
        );
      } catch {
        /* optional */
      }
    }

    const bodyPhoto = req.files?.bodyPhoto?.[0];
    const customDesign = req.files?.customDesign?.[0];

    const total = totalAmount ? parseFloat(totalAmount) : 0;
    const paid = amountPaid ? parseFloat(amountPaid) : 0;
    const validMethods = ['cash', 'upi', 'card', 'bank', 'other'];
    const method = validMethods.includes(paymentMethod) ? paymentMethod : null;
    const status =
      ['pending', 'partial', 'paid'].includes(paymentStatus) ?
        paymentStatus
      : derivePaymentStatus(total, paid);

    const order = await Order.create({
      tailor: tailorId,
      shopCustomer: shopCustomer._id,
      clientName: shopCustomer.name,
      clientPhone: shopCustomer.phone,
      clientEmail: normalizeEmail(shopCustomer.email),
      design: designId || undefined,
      customDesignImage: customDesign
        ? `/uploads/designs/${path.basename(customDesign.path)}`
        : undefined,
      bodyPhoto: bodyPhoto ? `/uploads/body/${path.basename(bodyPhoto.path)}` : undefined,
      measurements: measurements?._id,
      garmentType: garmentType || 'shirt',
      fabricDetails,
      notes,
      sizeRecommendation,
      totalAmount: total,
      amountPaid: paid,
      receiptNumber: generateReceiptNumber(),
      receiptIssuedAt: new Date(),
      paymentMethod: method,
      paymentNotes: paymentNotes?.trim() || undefined,
      paymentStatus: status,
      statusHistory: [
        {
          status: 'placed',
          note: `Order placed · Receipt issued · ${status === 'paid' ? 'Paid in full' : status === 'partial' ? 'Partial payment' : 'Payment pending'}`,
          updatedBy: tailorId,
        },
      ],
    });

    const io = req.app.get('io');
    await createNotification(io, {
      userId: tailorId,
      title: 'New order created',
      message: `Order ${order.orderNumber} for ${shopCustomer.name}`,
      orderId: order._id,
    });

    const populatedForNotify = await Order.findById(order._id).populate('shopCustomer', 'name email');
    await notifyCustomerForOrder(io, populatedForNotify, 'placed');

    const populated = await Order.findById(order._id)
      .populate('shopCustomer', 'name phone email address')
      .populate('tailor', 'name phone email')
      .populate('design')
      .populate('measurements');

    const tailorUser = await User.findById(tailorId).select('name phone email');
    const orderWithReceipt = attachReceiptToOrder(populated, tailorUser);

    res.status(201).json({
      success: true,
      order: orderWithReceipt,
      paymentReceipt: orderWithReceipt.paymentReceipt,
      message: 'Order and payment receipt saved',
    });
  }
);

/** Customer portal — orders matched by registered email */
router.get('/customer/my', protect, authorize('customer'), requireMongo, async (req, res) => {
  const orderList = await findOrdersForCustomerUser(req.user);
  const orders = orderList.map((o) => attachReceiptToOrder(o, o.tailor));
  const stats = {
    total: orders.length,
    active: orders.filter((o) => !['delivered', 'cancelled', 'ready'].includes(o.status)).length,
    ready: orders.filter((o) => o.status === 'ready').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
  };
  res.json({ success: true, orders, stats, email: req.user.email });
});

function enrichCustomerOrder(order) {
  if (!order) return null;
  return attachReceiptToOrder(order, order.tailor);
}

router.get('/customer/:id', protect, authorize('customer'), requireMongo, async (req, res) => {
  const order = await findCustomerOrderById(req.params.id, req.user);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found or email does not match your account',
    });
  }
  const withReceipt = enrichCustomerOrder(order);
  res.json({ success: true, order: withReceipt, paymentReceipt: withReceipt.paymentReceipt });
});

router.get('/my', protect, authorize('tailor', 'admin'), requireMongo, async (req, res) => {
  const orders = await Order.find({ tailor: getUserId(req.user) })
    .populate('shopCustomer', 'name phone email')
    .populate('design')
    .sort({ createdAt: -1 });
  res.json({ success: true, orders });
});

router.get('/dashboard', protect, authorize('tailor', 'admin'), requireMongo, async (req, res) => {
  const orders = await Order.find({ tailor: getUserId(req.user) })
    .populate('shopCustomer', 'name phone email')
    .populate('design')
    .populate('measurements')
    .sort({ updatedAt: -1 });

  const stats = {
    total: orders.length,
    active: orders.filter((o) => !['delivered', 'cancelled', 'ready'].includes(o.status)).length,
    ready: orders.filter((o) => o.status === 'ready').length,
  };

  res.json({ success: true, orders, stats });
});

router.get('/:id', protect, authorize('tailor', 'admin'), requireMongo, async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('shopCustomer', 'name phone email address')
    .populate('tailor', 'name')
    .populate('design')
    .populate('measurements');

  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const tailorId = String(order.tailor._id || order.tailor);
  if (tailorId !== getUserId(req.user) && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const withReceipt = attachReceiptToOrder(order, order.tailor);
  res.json({ success: true, order: withReceipt, paymentReceipt: withReceipt.paymentReceipt });
});

router.patch('/:id/status', protect, authorize('tailor', 'admin'), requireMongo, async (req, res) => {
  const { status, tailorNotes, estimatedDelivery } = req.body;
  const valid = Order.PROGRESS_STAGES || [];
  if (!valid.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const order = await Order.findById(req.params.id).populate('shopCustomer');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const tailorId = getUserId(req.user);
  if (String(order.tailor._id || order.tailor) !== tailorId && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  if (!order.clientEmail && order.shopCustomer?.email) {
    order.clientEmail = normalizeEmail(order.shopCustomer.email);
  }

  order.status = status;
  order.progressPercent = PROGRESS_MAP[status] ?? order.progressPercent;
  if (tailorNotes) order.tailorNotes = tailorNotes;
  if (estimatedDelivery) order.estimatedDelivery = estimatedDelivery;
  if (!order.tailor) order.tailor = tailorId;

  order.statusHistory.push({
    status,
    note: tailorNotes || `Status updated to ${status}`,
    updatedBy: getUserId(req.user),
  });

  await order.save();

  const io = req.app.get('io');
  const clientLabel = order.clientName || order.shopCustomer?.name || 'Customer';

  io.to(`order:${order._id}`).emit('orderStatusUpdate', {
    orderId: order._id,
    status: order.status,
    progressPercent: order.progressPercent,
  });

  await createNotification(io, {
    userId: tailorId,
    title: status === 'ready' ? 'Order ready' : 'Order update',
    message:
      status === 'ready'
        ? `${clientLabel} — order ${order.orderNumber} is ready.`
        : `${clientLabel} — ${order.orderNumber}: ${status.replace(/_/g, ' ')}`,
    type: 'order_update',
    orderId: order._id,
  });

  await notifyCustomerForOrder(io, order, status);

  res.json({ success: true, order });
});

router.patch('/:id/assign', protect, authorize('admin', 'tailor'), requireMongo, async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { tailor: req.body.tailorId || getUserId(req.user) },
    { new: true }
  );
  res.json({ success: true, order });
});

module.exports = router;
