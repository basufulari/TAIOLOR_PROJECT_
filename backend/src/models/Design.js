const mongoose = require('mongoose');

const designSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: ['shirt', 'pants', 'suit', 'dress', 'kurta', 'blouse', 'other'],
      default: 'shirt',
    },
    imageUrl: { type: String, required: true },
    fabricType: { type: String },
    colors: [String],
    price: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isPublic: { type: Boolean, default: true },
    tags: [String],
    source: { type: String, enum: ['upload', 'canvas'], default: 'upload' },
    sketchUrl: { type: String },
    strokeData: { type: mongoose.Schema.Types.Mixed },
    detectedPatterns: [
      {
        name: String,
        confidence: Number,
        description: String,
      },
    ],
    garmentSilhouette: { type: String },
    styleFeatures: { type: mongoose.Schema.Types.Mixed },
    aiAnalysis: { type: mongoose.Schema.Types.Mixed },
    similarStyleHints: [{ type: mongoose.Schema.Types.Mixed }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Design', designSchema);
