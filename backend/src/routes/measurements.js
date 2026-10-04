const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Measurement = require('../models/Measurement');
const Customer = require('../models/Customer');
const { protect, authorize } = require('../middleware/auth');
const requireMongo = require('../middleware/requireMongo');
const { upload, uploadDir } = require('../middleware/upload');
const { detectMeasurements, recommendSize } = require('../services/aiClient');
const { estimateFromImage, isAiUnreachable } = require('../services/measurementFallback');
const { isAiOnline } = require('../services/aiClient');
const { normalizeScanConfidence } = require('../utils/scanConfidence');
const { getUserId } = require('../utils/userId');

const router = express.Router();

router.post(
  '/detect',
  protect,
  authorize('tailor', 'admin'),
  requireMongo,
  (req, res, next) => {
    req.uploadFolder = 'body';
    next();
  },
  upload.single('image'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image required' });
    }

    const imagePath = req.file.path;
    const heightCm = req.body.heightCm ? parseFloat(req.body.heightCm) : null;
    const userId = getUserId(req.user);
    let customerName = req.body.customerName?.trim();
    let customerPhone = req.body.customerPhone?.trim();
    let customerEmail = req.body.customerEmail?.trim()?.toLowerCase();
    let customerAddress = req.body.customerAddress?.trim();
    let customerNotes = req.body.customerNotes?.trim();
    let customerId = req.body.customerId || null;

    if (!customerName) {
      return res.status(400).json({
        success: false,
        message: 'Enter customer name before saving measurements',
      });
    }

    if (customerName) {
      let customer = customerId ? await Customer.findById(customerId) : null;
      if (!customer) {
        customer = await Customer.findOne({
          tailor: userId,
          name: new RegExp(`^${customerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        });
      }
      if (!customer) {
        customer = await Customer.create({
          tailor: userId,
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
          address: customerAddress,
          notes: customerNotes,
        });
      } else {
        customer.phone = customerPhone || customer.phone;
        customer.email = customerEmail || customer.email;
        customer.address = customerAddress || customer.address;
        if (customerNotes) customer.notes = customerNotes;
        await customer.save();
      }
      customerId = customer._id;
      customerName = customer.name;
      customerPhone = customer.phone;
      customerEmail = customer.email;
      customerAddress = customer.address;
    }

    let aiResult;
    let usedFallback = false;
    let laserScanImage = null;

    try {
      const aiUp = await isAiOnline();
      if (!aiUp) {
        console.warn('AI service not reachable — start: .\\start-ai.ps1');
      }
      aiResult = await detectMeasurements(imagePath, heightCm);
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
      const status = err.response?.status || 502;
      const detailStr = Array.isArray(detail) ? detail[0]?.msg || String(detail[0]) : String(detail || '');
      const isInvalidPhoto =
        status === 422 &&
        (detailStr.includes('full-body') ||
          detailStr.includes('Please upload') ||
          detailStr.includes('Face-only') ||
          detailStr.includes('selfie') ||
          detailStr.includes('No human pose') ||
          detailStr.includes('No person detected'));

      if (isInvalidPhoto) {
        return res.status(422).json({
          success: false,
          message: detailStr,
          code: 'INVALID_BODY_PHOTO',
        });
      }

      const errCode = err.code || 'unknown';
      console.warn('AI measurement failed:', detailStr || err.message, `[${errCode}]`);

      if (isAiUnreachable(err)) {
        usedFallback = true;
        aiResult = estimateFromImage(imagePath);
        console.warn('Using proportional fallback (start AI: .\\start-ai.ps1 for laser scan)');
      } else {
        return res.status(status >= 400 && status < 500 ? status : 502).json({
          success: false,
          message:
            detailStr ||
            err.message ||
            'AI scan failed. Use a full-body photo and ensure AI service is running.',
        });
      }
    }

    const m = aiResult.measurements || aiResult;

    const scanConfidence = normalizeScanConfidence(aiResult, usedFallback);

    if (aiResult.laser_image_base64) {
      const laserDir = path.join(uploadDir, 'laser');
      fs.mkdirSync(laserDir, { recursive: true });
      const laserName = `laser-${Date.now()}.png`;
      const laserPath = path.join(laserDir, laserName);
      fs.writeFileSync(laserPath, Buffer.from(aiResult.laser_image_base64, 'base64'));
      laserScanImage = `/uploads/laser/${laserName}`;
    }

    const measurement = await Measurement.create({
      user: userId,
      customer: customerId,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      customerNotes,
      chest: m.chest,
      waist: m.waist,
      shoulder: m.shoulder,
      sleeveLength: m.sleeve_length ?? m.sleeveLength,
      height: m.height,
      hips: m.hips,
      inseam: m.inseam,
      neck: m.neck,
      armLength: m.arm_length ?? m.armLength,
      forearm: m.forearm,
      thigh: m.thigh,
      bicep: m.bicep,
      unit: m.unit || 'cm',
      sourceImage: `/uploads/body/${path.basename(imagePath)}`,
      laserScanImage,
      confidence: scanConfidence,
      aiMetadata: {
        method: aiResult.method,
        heightAutoDetected: aiResult.height_auto_detected,
        usedFallback,
      },
      isPrimary: true,
    });

    await Measurement.updateMany(
      { user: userId, _id: { $ne: measurement._id } },
      { isPrimary: false }
    );

    let recommendation = null;
    try {
      recommendation = await recommendSize(
        {
          chest: measurement.chest,
          waist: measurement.waist,
          shoulder: measurement.shoulder,
          sleeve_length: measurement.sleeveLength,
          height: measurement.height,
        },
        req.body.garmentType || 'shirt'
      );
    } catch {
      /* optional */
    }

    const measurementOut = measurement.toObject ? measurement.toObject() : { ...measurement };
    measurementOut.confidence = scanConfidence;

    res.status(201).json({
      success: true,
      measurement: measurementOut,
      customer: {
        id: customerId,
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        address: customerAddress,
        notes: customerNotes,
      },
      savedMessage: `Measurements saved for ${customerName}`,
      recommendation,
      laserScanUrl: laserScanImage,
      usedFallback,
      heightAutoDetected: aiResult.height_auto_detected !== false,
      accuracyNote: usedFallback
        ? `Auto-detected — ${Math.round(scanConfidence * 100)}% confidence. Run .\\start-ai.ps1 for laser overlay.`
        : aiResult.height_auto_detected
          ? `Calibrated laser scan — ${Math.round(scanConfidence * 100)}% confidence. Stand 2–3 m back, full body in frame.`
          : `Measurements calibrated — ${Math.round(scanConfidence * 100)}% confidence`,
    });
  }
);

router.get('/', protect, authorize('tailor', 'admin'), requireMongo, async (req, res) => {
  const filter = { user: getUserId(req.user) };
  if (req.query.customerId) filter.customer = req.query.customerId;
  const measurements = await Measurement.find(filter)
    .populate('customer', 'name phone email')
    .sort({ createdAt: -1 });
  res.json({ success: true, measurements });
});

router.get('/primary', protect, authorize('tailor', 'admin'), requireMongo, async (req, res) => {
  const filter = { user: getUserId(req.user), isPrimary: true };
  if (req.query.customerId) filter.customer = req.query.customerId;
  const measurement = await Measurement.findOne(filter)
    .populate('customer', 'name phone email')
    .sort({ createdAt: -1 });
  res.json({ success: true, measurement });
});

module.exports = router;
