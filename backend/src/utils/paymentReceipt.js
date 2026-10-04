/** Build payment receipt payload for API / customer app */

function derivePaymentStatus(totalAmount, amountPaid) {
  const total = Number(totalAmount) || 0;
  const paid = Number(amountPaid) || 0;
  if (total <= 0 && paid <= 0) return 'pending';
  if (paid >= total && total > 0) return 'paid';
  if (paid > 0) return 'partial';
  return 'pending';
}

function generateReceiptNumber() {
  return `RCP-${Date.now().toString(36).toUpperCase()}`;
}

function formatPaymentReceipt(order, tailor) {
  const doc = order.toObject ? order.toObject() : order;
  const total = Number(doc.totalAmount) || 0;
  const paid = Number(doc.amountPaid) || 0;
  const balance = Math.max(0, Math.round((total - paid) * 100) / 100);

  return {
    receiptNumber: doc.receiptNumber,
    orderNumber: doc.orderNumber,
    issuedAt: doc.receiptIssuedAt || doc.createdAt,
    customerName: doc.clientName || doc.shopCustomer?.name,
    customerPhone: doc.clientPhone || doc.shopCustomer?.phone,
    customerEmail: doc.clientEmail || doc.shopCustomer?.email,
    tailorName: tailor?.name || doc.tailor?.name,
    tailorPhone: tailor?.phone || doc.tailor?.phone,
    garmentType: doc.garmentType,
    fabricDetails: doc.fabricDetails,
    notes: doc.notes,
    totalAmount: total,
    amountPaid: paid,
    balanceDue: balance,
    paymentStatus: doc.paymentStatus,
    paymentMethod: doc.paymentMethod || null,
    paymentNotes: doc.paymentNotes || null,
    currency: 'INR',
    currencySymbol: '₹',
  };
}

function attachReceiptToOrder(order, tailor) {
  const plain = order.toObject ? order.toObject() : { ...order };
  plain.paymentReceipt = formatPaymentReceipt(order, tailor);
  return plain;
}

module.exports = {
  derivePaymentStatus,
  generateReceiptNumber,
  formatPaymentReceipt,
  attachReceiptToOrder,
};
