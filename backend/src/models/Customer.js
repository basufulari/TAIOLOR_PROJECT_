const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    tailor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

customerSchema.index({ tailor: 1, name: 1 });

module.exports = mongoose.model('Customer', customerSchema);
