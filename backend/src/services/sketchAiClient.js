const axios = require('axios');
const { analyzeStrokesLocal } = require('./sketchAnalyzerLocal');

const AI_BASE = process.env.AI_SERVICE_URL || 'http://localhost:8000';

async function analyzeSketch(paths, canvasWidth = 400, canvasHeight = 500) {
  try {
    const { data } = await axios.post(
      `${AI_BASE}/api/sketch/analyze`,
      {
        paths,
        canvas_width: canvasWidth,
        canvas_height: canvasHeight,
      },
      { timeout: 60000 }
    );
    return data;
  } catch (err) {
    const status = err.response?.status;
    const unreachable =
      err.code === 'ECONNREFUSED' ||
      err.code === 'ENOTFOUND' ||
      status === 404 ||
      status === 503;

    if (unreachable) {
      console.warn('AI sketch service unavailable, using local analyzer:', err.message);
      return analyzeStrokesLocal(paths, canvasWidth, canvasHeight);
    }
    throw err;
  }
}

module.exports = { analyzeSketch };
