const mongoose = require('mongoose');

const measurementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true },
    customerEmail: { type: String, trim: true },
    customerAddress: { type: String, trim: true },
    customerNotes: { type: String, trim: true },
    chest: { type: Number },
    waist: { type: Number },
    shoulder: { type: Number },
    sleeveLength: { type: Number },
    height: { type: Number },
    hips: { type: Number },
    inseam: { type: Number },
    neck: { type: Number },
    armLength: { type: Number },
    forearm: { type: Number },
    thigh: { type: Number },
    bicep: { type: Number },
    unit: { type: String, default: 'cm' },
    sourceImage: { type: String },
    laserScanImage: { type: String },
    confidence: { type: Number },
    aiMetadata: { type: mongoose.Schema.Types.Mixed },
    isPrimary: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Measurement', measurementSchema);
