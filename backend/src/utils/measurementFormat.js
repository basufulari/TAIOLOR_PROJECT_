/** Normalize measurement document for API responses */
function formatMeasurement(m) {
  if (!m) return null;
  const doc = m.toObject ? m.toObject() : m;
  return {
    id: doc._id,
    customer: doc.customer,
    customerName: doc.customerName,
    customerPhone: doc.customerPhone,
    customerEmail: doc.customerEmail,
    customerAddress: doc.customerAddress,
    customerNotes: doc.customerNotes,
    chest: doc.chest,
    waist: doc.waist,
    shoulder: doc.shoulder,
    sleeveLength: doc.sleeveLength,
    height: doc.height,
    hips: doc.hips,
    inseam: doc.inseam,
    neck: doc.neck,
    armLength: doc.armLength,
    forearm: doc.forearm,
    thigh: doc.thigh,
    bicep: doc.bicep,
    unit: doc.unit || 'cm',
    confidence: doc.confidence,
    isPrimary: doc.isPrimary,
    sourceImage: doc.sourceImage,
    laserScanImage: doc.laserScanImage,
    aiMetadata: doc.aiMetadata,
    scannedAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

module.exports = { formatMeasurement };
