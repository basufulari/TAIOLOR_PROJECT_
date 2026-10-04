/**
 * Display confidence shown in app (95–100% for successful auto-detect scans).
 */
function displayScanConfidence(aiResult, usedFallback) {
  const raw = Number(aiResult?.confidence) || 0;
  const method = String(aiResult?.method || '');
  const hasLaser = Boolean(aiResult?.laser_image_base64);

  if (!usedFallback && (method.includes('mediapipe') || method.includes('calibrated') || hasLaser)) {
    if (raw >= 0.99) return 1;
    if (raw >= 0.95) return Math.min(1, raw);
    return 0.98;
  }

  if (!usedFallback && method.includes('hog')) {
    return Math.min(0.98, Math.max(0.95, raw || 0.96));
  }

  // Successful save via offline estimate — show 95–100 per product requirement
  if (usedFallback) {
    return 0.98;
  }

  return Math.min(1, Math.max(0.95, raw || 0.97));
}

/** @deprecated alias */
const normalizeScanConfidence = displayScanConfidence;

module.exports = { displayScanConfidence, normalizeScanConfidence };
