const Customer = require('../models/Customer');
const Order = require('../models/Order');
const User = require('../models/User');
const { createNotification } = require('./notifications');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function shopCustomerIdsForEmail(email) {
  const norm = normalizeEmail(email);
  if (!norm) return [];
  const rows = await Customer.find({
    email: new RegExp(`^${escapeRegex(norm)}$`, 'i'),
  })
    .select('_id')
    .lean();
  return rows.map((c) => c._id);
}

async function buildCustomerOrderFilter(email) {
  const norm = normalizeEmail(email);
  const shopIds = await shopCustomerIdsForEmail(norm);
  const or = [];
  if (norm) or.push({ clientEmail: norm });
  if (shopIds.length) or.push({ shopCustomer: { $in: shopIds } });
  if (!or.length) return { _id: null };
  return { $or: or };
}

async function countOrdersForEmail(email) {
  const filter = await buildCustomerOrderFilter(email);
  if (filter._id === null) return 0;
  return Order.countDocuments(filter);
}

async function findOrdersForCustomerUser(user, options = {}) {
  const filter = await buildCustomerOrderFilter(user.email);
  if (filter._id === null) return [];
  let q = Order.find(filter)
    .populate('shopCustomer', 'name phone email')
    .populate('tailor', 'name phone')
    .populate('design', 'title category imageUrl')
    .sort({ updatedAt: -1 });
  if (options.limit) q = q.limit(options.limit);
  return q.lean();
}

async function findCustomerOrderById(orderId, user) {
  const order = await Order.findById(orderId)
    .populate('shopCustomer', 'name phone email address')
    .populate('tailor', 'name phone email address')
    .populate('design', 'title category imageUrl')
    .populate('measurements', 'chest waist height shoulder sleeveLength');
  if (!order) return null;

  const norm = normalizeEmail(user.email);
  const shopEmail = normalizeEmail(order.shopCustomer?.email);
  const clientEmail = normalizeEmail(order.clientEmail);

  const emailMatch =
    (norm && clientEmail && norm === clientEmail) ||
    (norm && shopEmail && norm === shopEmail);

  return emailMatch ? order : null;
}

const STATUS_TITLES = {
  placed: 'Order placed',
  measurements_confirmed: 'Measurements confirmed',
  cutting: 'Cutting started',
  stitching: 'Stitching in progress',
  fitting: 'Fitting',
  quality_check: 'Quality check',
  ready: 'Your cloth is ready!',
  delivered: 'Order delivered',
  cancelled: 'Order cancelled',
};

function customerStatusMessage(order, status) {
  const num = order.orderNumber || 'your order';
  const garment = order.garmentType || 'garment';
  if (status === 'placed') {
    const total = order.totalAmount ? ` Total ₹${order.totalAmount}.` : '';
    const paid = order.amountPaid ? ` Paid ₹${order.amountPaid}.` : '';
    return `Order ${num} placed.${total}${paid} View payment receipt in My Orders.`;
  }
  const map = {
    measurements_confirmed: `Measurements confirmed for ${num}.`,
    cutting: `Your ${garment} (${num}) is being cut.`,
    stitching: `Stitching in progress for ${num}.`,
    fitting: `Fitting stage for ${num}.`,
    quality_check: `Final quality check for ${num}.`,
    ready: `Order ${num} is READY! Visit your tailor to collect.`,
    delivered: `Order ${num} has been delivered. Thank you!`,
    cancelled: `Order ${num} was cancelled.`,
  };
  return map[status] || `Order ${num}: ${status.replace(/_/g, ' ')}`;
}

async function notifyCustomerForOrder(io, order, status) {
  const emails = new Set();
  const fromShop = normalizeEmail(order.shopCustomer?.email);
  const fromClient = normalizeEmail(order.clientEmail);
  if (fromShop) emails.add(fromShop);
  if (fromClient) emails.add(fromClient);

  for (const email of emails) {
    const user = await User.findOne({ email, role: 'customer' });
    if (!user) continue;

    const title =
      status === 'ready'
        ? 'Cloth is ready!'
        : status === 'delivered'
          ? 'Order completed'
          : STATUS_TITLES[status] || 'Order update';

    await createNotification(io, {
      userId: user._id,
      title,
      message: customerStatusMessage(order, status),
      type: status === 'ready' || status === 'delivered' ? 'order_complete' : 'order_update',
      orderId: order._id,
      data: { status, progressPercent: order.progressPercent, orderNumber: order.orderNumber },
    });
  }
}

module.exports = {
  normalizeEmail,
  countOrdersForEmail,
  findOrdersForCustomerUser,
  findCustomerOrderById,
  notifyCustomerForOrder,
  customerStatusMessage,
};
