const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

function aiBaseUrls() {
  const primary = (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
  const urls = [primary, 'http://127.0.0.1:8000', 'http://localhost:8000'];
  return [...new Set(urls)];
}

function buildDetectForm(imagePath, heightCm) {
  const form = new FormData();
  form.append('image', fs.createReadStream(imagePath));
  if (heightCm) form.append('height_cm', String(heightCm));
  return form;
}

async function detectMeasurements(imagePath, heightCm = null) {
  let lastErr;
  for (const base of aiBaseUrls()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const form = buildDetectForm(imagePath, heightCm);
        const { data } = await axios.post(`${base}/api/measurements/detect`, form, {
          headers: form.getHeaders(),
          timeout: 120000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });
        return data;
      } catch (err) {
        lastErr = err;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }
  }
  throw lastErr;
}

async function recommendSize(measurements, garmentType = 'shirt') {
  const base = aiBaseUrls()[0];
  const { data } = await axios.post(`${base}/api/recommendations/size`, {
    measurements,
    garment_type: garmentType,
  });
  return data;
}

async function virtualTryOn(bodyImagePath, clothImagePath, garmentType = 'shirt') {
  const base = aiBaseUrls()[0];
  const form = new FormData();
  form.append('body_image', fs.createReadStream(bodyImagePath));
  form.append('cloth_image', fs.createReadStream(clothImagePath));
  if (garmentType) form.append('garment_type', garmentType);

  const { data } = await axios.post(`${base}/api/tryon/generate`, form, {
    headers: form.getHeaders(),
    responseType: 'arraybuffer',
  });
  return data;
}

async function healthCheck() {
  let lastErr;
  for (const base of aiBaseUrls()) {
    try {
      const { data } = await axios.get(`${base}/health`, { timeout: 5000 });
      return data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function isAiOnline() {
  try {
    await healthCheck();
    return true;
  } catch {
    return false;
  }
}

module.exports = { detectMeasurements, recommendSize, virtualTryOn, healthCheck, isAiOnline };
