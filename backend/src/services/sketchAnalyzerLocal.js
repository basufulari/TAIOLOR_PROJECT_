/**
 * Local sketch analysis (no Python) — used when AI service is offline or missing route.
 */

const STYLE_LIBRARY = {
  shirt: [
    { name: 'Classic formal shirt', tags: ['formal', 'collar'], match: 0.9 },
    { name: 'Casual Oxford shirt', tags: ['casual'], match: 0.86 },
    { name: 'Slim fit shirt', tags: ['slim'], match: 0.83 },
  ],
  kurta: [
    { name: 'Straight kurta', tags: ['ethnic'], match: 0.88 },
    { name: 'Angrakha kurta', tags: ['traditional'], match: 0.84 },
  ],
  dress: [
    { name: 'A-line dress', tags: ['party'], match: 0.89 },
    { name: 'Anarkali dress', tags: ['ethnic'], match: 0.85 },
  ],
  pants: [
    { name: 'Slim trousers', tags: ['formal'], match: 0.88 },
    { name: 'Chinos', tags: ['casual'], match: 0.84 },
  ],
  suit: [{ name: 'Two-piece suit', tags: ['formal'], match: 0.9 }],
  blouse: [{ name: 'Designer blouse', tags: ['party'], match: 0.87 }],
};

function bbox(paths) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let totalPts = 0;

  for (const path of paths) {
    for (const pt of path.points || []) {
      const x = pt[0];
      const y = pt[1];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      totalPts += 1;
    }
  }

  if (totalPts === 0) return null;
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, totalPts };
}

function detectSilhouette(box, canvasW, canvasH) {
  const aspect = box.h / Math.max(box.w, 1);
  const fill = box.h / canvasH;

  if (aspect > 1.5 && fill > 0.45) return 'dress';
  if (aspect > 1.25) return 'kurta';
  if (aspect < 0.85) return 'pants';
  if (aspect > 1.1 && box.w / canvasW > 0.45) return 'suit';
  return 'shirt';
}

function detectPatterns(paths, box) {
  const patterns = [];
  const horiz = [];
  const vert = [];

  for (const path of paths) {
    const pts = path.points || [];
    for (let i = 1; i < pts.length; i++) {
      const dx = Math.abs(pts[i][0] - pts[i - 1][0]);
      const dy = Math.abs(pts[i][1] - pts[i - 1][1]);
      if (dx > dy * 2) horiz.push(1);
      if (dy > dx * 2) vert.push(1);
    }
  }

  if (horiz.length >= 3 || vert.length >= 3) {
    patterns.push({
      name: 'stripes',
      confidence: 0.82,
      description: 'Linear stroke pattern suggests stripes',
    });
  }

  if (box.totalPts > 80) {
    patterns.push({
      name: 'textured',
      confidence: 0.75,
      description: 'Dense sketch strokes — textured look',
    });
  }

  if (!patterns.length) {
    patterns.push({
      name: 'plain',
      confidence: 0.88,
      description: 'Clean plain garment sketch',
    });
  }

  return patterns;
}

function analyzeStrokesLocal(paths, canvasWidth = 400, canvasHeight = 500) {
  const box = bbox(paths);
  if (!box) {
    throw new Error('Draw a sketch on the canvas first');
  }

  const silhouette = detectSilhouette(box, canvasWidth, canvasHeight);
  const patterns = detectPatterns(paths, box);
  const similar = (STYLE_LIBRARY[silhouette] || STYLE_LIBRARY.shirt).map((s) => ({
    ...s,
    category: silhouette,
  }));

  return {
    success: true,
    silhouette,
    category: silhouette,
    patterns,
    features: {
      neckline: 'round',
      sleeves: box.w / canvasWidth > 0.5 ? 'short' : 'long',
      fit: box.h / box.w > 1.4 ? 'slim' : 'regular',
      bbox: [box.minX, box.minY, box.w, box.h],
    },
    similar_styles: similar,
    confidence: 0.78,
    analysis_note: 'Analyzed locally (restart AI service for advanced detection)',
    method: 'local_stroke_analysis',
  };
}

module.exports = { analyzeStrokesLocal };
