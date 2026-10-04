const Notification = require('../models/Notification');

async function createNotification(io, { userId, title, message, type, orderId, data }) {
  const notification = await Notification.create({
    user: userId,
    title,
    message,
    type: type || 'order_update',
    order: orderId,
    data,
  });

  if (io) {
    io.to(`user:${userId}`).emit('notification', {
      id: notification._id,
      title,
      message,
      type: notification.type,
      orderId,
      createdAt: notification.createdAt,
    });
  }

  return notification;
}

module.exports = { createNotification };
