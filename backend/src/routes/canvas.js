const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Design = require('../models/Design');
const { protect, authorize } = require('../middleware/auth');
const requireMongo = require('../middleware/requireMongo');
const { uploadDir } = require('../middleware/upload');
const { analyzeSketch } = require('../services/sketchAiClient');
const { getUserId } = require('../utils/userId');

const router = express.Router();

const useMongo = () => mongoose.connection.readyState === 1;

router.post('/analyze', protect, authorize('tailor', 'admin'), requireMongo, async (req, res) => {
  const { paths, canvasWidth = 400, canvasHeight = 500 } = req.body;

  if (!paths?.length) {
    return res.status(400).json({ success: false, message: 'Draw a sketch on the canvas first' });
  }

  try {
    const analysis = await analyzeSketch(paths, canvasWidth, canvasHeight);
    const similarFromDb = await findSimilarDesigns(analysis);

    res.json({
      success: true,
      analysis,
      similar_styles: mergeSimilarStyles(analysis.similar_styles, similarFromDb),
      sketchPreviewBase64: analysis.sketch_image_base64,
    });
  } catch (err) {
    const detail = err.response?.data?.detail || err.message;
    console.error('Sketch analyze failed:', detail);
    return res.status(err.response?.status || 502).json({
      success: false,
      message: detail.includes('503') ? 'Start AI service: .\\start-ai.ps1' : detail,
    });
  }
});

router.post('/save', protect, authorize('tailor', 'admin'), requireMongo, async (req, res) => {
  const {
    title,
    description,
    paths,
    canvasWidth = 400,
    canvasHeight = 500,
    analysis,
    isPublic = true,
  } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ success: false, message: 'Design title required' });
  }
  if (!paths?.length) {
    return res.status(400).json({ success: false, message: 'Canvas sketch is empty' });
  }

  try {
    let aiResult = analysis;
    if (!aiResult?.silhouette) {
      aiResult = await analyzeSketch(paths, canvasWidth, canvasHeight);
    }

    const sketchDir = path.join(uploadDir, 'sketches');
    fs.mkdirSync(sketchDir, { recursive: true });

    let sketchUrl = null;
    if (aiResult.sketch_image_base64) {
      const fname = `sketch-${Date.now()}.png`;
      fs.writeFileSync(
        path.join(sketchDir, fname),
        Buffer.from(aiResult.sketch_image_base64, 'base64')
      );
      sketchUrl = `/uploads/sketches/${fname}`;
    }

    const tags = [
      aiResult.silhouette,
      ...(aiResult.patterns || []).map((p) => p.name),
      aiResult.features?.neckline,
      aiResult.features?.sleeves,
    ].filter(Boolean);

    const design = await Design.create({
      title: title.trim(),
      description: description || `AI canvas design — ${aiResult.silhouette}`,
      category: aiResult.category || aiResult.silhouette || 'shirt',
      imageUrl: sketchUrl || 'https://picsum.photos/seed/canvas/400/500',
      sketchUrl,
      source: 'canvas',
      strokeData: { paths, canvasWidth, canvasHeight },
      detectedPatterns: aiResult.patterns || [],
      garmentSilhouette: aiResult.silhouette,
      styleFeatures: aiResult.features || {},
      aiAnalysis: aiResult,
      similarStyleHints: aiResult.similar_styles || [],
      tags,
      uploadedBy: getUserId(req.user),
      isPublic: isPublic !== false && isPublic !== 'false',
      price: 0,
    });

    res.status(201).json({
      success: true,
      design,
      message: 'Custom design saved to MongoDB',
    });
  } catch (err) {
    const detail = err.response?.data?.detail || err.message;
    console.error('Canvas save failed:', detail);
    return res.status(500).json({ success: false, message: detail });
  }
});

router.get('/mine', protect, authorize('tailor', 'admin'), requireMongo, async (req, res) => {
  const designs = await Design.find({
    uploadedBy: getUserId(req.user),
    source: 'canvas',
  }).sort({ createdAt: -1 });
  res.json({ success: true, designs });
});

async function findSimilarDesigns(analysis) {
  if (!useMongo()) return [];

  const category = analysis.category || analysis.silhouette || 'shirt';
  const patternNames = (analysis.patterns || []).map((p) => p.name);

  const filter = { isPublic: true, category };
  if (patternNames.length) {
    filter.$or = [{ tags: { $in: patternNames } }, { category }];
  }

  const designs = await Design.find(filter).limit(6).select('title category imageUrl tags price');
  return designs.map((d) => ({
    id: String(d._id),
    name: d.title,
    category: d.category,
    imageUrl: d.imageUrl,
    tags: d.tags,
    match: 0.82,
    fromDatabase: true,
  }));
}

function mergeSimilarStyles(aiStyles = [], dbStyles = []) {
  const seen = new Set();
  const merged = [];

  for (const s of [...aiStyles, ...dbStyles]) {
    const key = s.name || s.title;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(s);
  }
  return merged.slice(0, 8);
}

module.exports = router;
