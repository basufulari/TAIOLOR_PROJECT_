const express = require('express');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const { upload, uploadDir } = require('../middleware/upload');
const { virtualTryOn } = require('../services/aiClient');

const router = express.Router();

router.post(
  '/',
  protect,
  upload.fields([
    { name: 'bodyImage', maxCount: 1 },
    { name: 'clothImage', maxCount: 1 },
  ]),
  async (req, res) => {
    const bodyFile = req.files?.bodyImage?.[0];
    const clothFile = req.files?.clothImage?.[0];

    if (!bodyFile || !clothFile) {
      return res.status(400).json({
        success: false,
        message: 'Both body and cloth images are required',
      });
    }

    try {
      const garmentType = req.body.garmentType || req.body.garment_type || 'shirt';
      const buffer = await virtualTryOn(bodyFile.path, clothFile.path, garmentType);
      const outName = `tryon-${Date.now()}.png`;
      const outDir = path.join(uploadDir, 'tryon');
      const outPath = path.join(outDir, outName);
      fs.writeFileSync(outPath, Buffer.from(buffer));

      res.json({
        success: true,
        previewUrl: `/uploads/tryon/${outName}`,
        garmentType,
      });
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      const status = err.response?.status === 422 ? 422 : 502;
      console.error('Try-on failed:', detail);
      res.status(status).json({
        success: false,
        message: status === 422 ? detail : 'Virtual try-on failed — ensure AI service is running',
        detail,
      });
    }
  }
);

module.exports = router;
