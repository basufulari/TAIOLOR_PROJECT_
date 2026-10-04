const express = require('express');
const QRCode = require('qrcode');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');
const requireMongo = require('../middleware/requireMongo');
const { getUserId } = require('../utils/userId');
const { createPaymentLink, fetchPaymentLink } = require('../services/razorpayClient');

const router = express.Router();

// Create a Razorpay payment link and return QR code (base64 PNG)
router.post(
  '/razorpay/payment-link',
  protect,
  authorize('tailor', 'admin'),
  requireMongo,
  async (req, res) => {
    const { orderId } = req.body;
    const amountInr = req.body.amountInr ?? req.body.amount ?? null;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId required' });
    }

    const userId = getUserId(req.user);
    const order = await Order.findOne({ _id: orderId, tailor: userId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const amount = Number(amountInr ?? order.totalAmount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount for online payment' });
    }

    // If already created, just re-send QR
    if (order.razorpayPaymentLinkId && order.razorpayShortUrl) {
      const qrDataUrl = await QRCode.toDataURL(order.razorpayShortUrl, { margin: 1, width: 280 });
      return res.json({
        success: true,
        orderId: String(order._id),
        paymentProvider: 'razorpay',
        paymentLinkId: order.razorpayPaymentLinkId,
        shortUrl: order.razorpayShortUrl,
        qrCodeDataUrl: qrDataUrl,
        paymentStatus: order.paymentStatus,
      });
    }

    const link = await createPaymentLink({
      amountInr: amount,
      referenceId: order.orderNumber || String(order._id),
      description: `AI Tailor order ${order.orderNumber || ''}`.trim(),
      customerName: order.clientName || order.shopCustomerName || 'Customer',
      customerEmail: order.clientEmail || undefined,
      customerContact: order.clientPhone || undefined,
    });

    const shortUrl = link.short_url || link.shortUrl || link.url || null;
    if (!shortUrl) {
      return res.status(502).json({ success: false, message: 'Razorpay did not return payment link URL' });
    }

    order.paymentProvider = 'razorpay';
    order.paymentMethod = 'upi';
    order.razorpayPaymentLinkId = link.id;
    order.razorpayShortUrl = shortUrl;
    order.paymentStatus = order.paymentStatus || 'pending';
    await order.save();

    const qrDataUrl = await QRCode.toDataURL(shortUrl, { margin: 1, width: 280 });

    res.json({
      success: true,
      orderId: String(order._id),
      paymentProvider: 'razorpay',
      paymentLinkId: link.id,
      shortUrl,
      qrCodeDataUrl: qrDataUrl,
      paymentStatus: order.paymentStatus,
    });
  }
);

// Poll payment status from Razorpay and update order if paid
router.get(
  '/razorpay/payment-link/:orderId/status',
  protect,
  authorize('tailor', 'admin'),
  requireMongo,
  async (req, res) => {
    const { orderId } = req.params;
    const userId = getUserId(req.user);
    const order = await Order.findOne({ _id: orderId, tailor: userId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (!order.razorpayPaymentLinkId) {
      return res.status(400).json({ success: false, message: 'No Razorpay payment link created for this order' });
    }

    const link = await fetchPaymentLink(order.razorpayPaymentLinkId);
    const status = String(link.status || '').toLowerCase();

    let updated = false;
    if (status === 'paid' && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.amountPaid = Math.max(Number(order.amountPaid || 0), Number(order.totalAmount || 0));
      order.razorpayPaidAt = new Date();
      updated = true;
      await order.save();
    }

    return res.json({
      success: true,
      orderId: String(order._id),
      razorpay: {
        paymentLinkId: order.razorpayPaymentLinkId,
        status,
      },
      paymentStatus: order.paymentStatus,
      updated,
    });
  }
);

module.exports = router;

