const mongoose = require('mongoose');

const PROGRESS_STAGES = [
  'placed',
  'measurements_confirmed',
  'cutting',
  'stitching',
  'fitting',
  'quality_check',
  'ready',
  'delivered',
  'cancelled',
];

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    shopCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    clientName: { type: String, trim: true },
    clientPhone: { type: String, trim: true },
    clientEmail: { type: String, trim: true, lowercase: true },
    tailor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    design: { type: mongoose.Schema.Types.ObjectId, ref: 'Design' },
    customDesignImage: { type: String },
    bodyPhoto: { type: String },
    measurements: { type: mongoose.Schema.Types.ObjectId, ref: 'Measurement' },
    garmentType: { type: String, default: 'shirt' },
    fabricDetails: { type: String },
    sizeRecommendation: { type: mongoose.Schema.Types.Mixed },
    tryOnPreview: { type: String },
    status: {
      type: String,
      enum: PROGRESS_STAGES,
      default: 'placed',
    },
    progressPercent: { type: Number, default: 5, min: 0, max: 100 },
    notes: { type: String },
    tailorNotes: { type: String },
    estimatedDelivery: { type: Date },
    totalAmount: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    receiptNumber: { type: String, unique: true, sparse: true },
    receiptIssuedAt: { type: Date },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card', 'bank', 'other', null],
      default: null,
    },
    paymentNotes: { type: String, trim: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid'],
      default: 'pending',
    },
    paymentProvider: { type: String, enum: ['razorpay', null], default: null },
    razorpayPaymentLinkId: { type: String, index: true },
    razorpayShortUrl: { type: String },
    razorpayPaidAt: { type: Date },
    statusHistory: [
      {
        status: String,
        note: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    this.orderNumber = `AT-${Date.now().toString(36).toUpperCase()}`;
  }
  if (!this.receiptNumber) {
    this.receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;
  }
  if (!this.receiptIssuedAt) {
    this.receiptIssuedAt = new Date();
  }
  next();
});

orderSchema.statics.PROGRESS_STAGES = PROGRESS_STAGES;

module.exports = mongoose.model('Order', orderSchema);
