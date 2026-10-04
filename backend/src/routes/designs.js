const express = require('express');
const path = require('path');
const Design = require('../models/Design');
const { protect, authorize } = require('../middleware/auth');
const requireMongo = require('../middleware/requireMongo');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.get('/', protect, requireMongo, async (req, res) => {
  const filter = { isPublic: true };
  if (req.query.category) filter.category = req.query.category;
  const designs = await Design.find(filter).populate('uploadedBy', 'name').sort({ createdAt: -1 });
  res.json({ success: true, designs });
});

router.get('/:id', protect, async (req, res) => {
  const design = await Design.findById(req.params.id).populate('uploadedBy', 'name');
  if (!design) return res.status(404).json({ success: false, message: 'Design not found' });
  res.json({ success: true, design });
});

router.post(
  '/',
  protect,
  authorize('tailor', 'admin'),
  requireMongo,
  (req, res, next) => {
    req.uploadFolder = 'designs';
    next();
  },
  upload.single('image'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Design image required' });
    }
    const design = await Design.create({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category || 'shirt',
      fabricType: req.body.fabricType,
      price: req.body.price ? parseFloat(req.body.price) : 0,
      colors: req.body.colors ? JSON.parse(req.body.colors) : [],
      imageUrl: `/uploads/designs/${path.basename(req.file.path)}`,
      uploadedBy: req.user._id,
      isPublic: req.body.isPublic !== 'false',
    });
    res.status(201).json({ success: true, design });
  }
);

router.put('/:id', protect, authorize('tailor', 'admin'), async (req, res) => {
  const design = await Design.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!design) return res.status(404).json({ success: false, message: 'Design not found' });
  res.json({ success: true, design });
});

router.delete('/:id', protect, authorize('tailor', 'admin'), async (req, res) => {
  await Design.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Design deleted' });
});

module.exports = router;
