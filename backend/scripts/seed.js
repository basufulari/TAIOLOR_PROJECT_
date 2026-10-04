/**
 * Seed sample designs: node scripts/seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Design = require('../src/models/Design');

const samples = [
  { title: 'Classic White Shirt', category: 'shirt', fabricType: 'Cotton', price: 1200, colors: ['white'], tags: ['formal'] },
  { title: 'Navy Formal Suit', category: 'suit', fabricType: 'Wool blend', price: 8500, colors: ['navy'], tags: ['wedding'] },
  { title: 'Casual Kurta', category: 'kurta', fabricType: 'Linen', price: 1800, colors: ['cream', 'blue'], tags: ['festive'] },
  { title: 'Slim Fit Trousers', category: 'pants', fabricType: 'Poly cotton', price: 1400, colors: ['black', 'grey'], tags: ['office'] },
  { title: 'Designer Blouse', category: 'blouse', fabricType: 'Silk', price: 2200, colors: ['red', 'gold'], tags: ['party'] },
  { title: 'Evening Dress', category: 'dress', fabricType: 'Georgette', price: 3500, colors: ['maroon'], tags: ['party'] },
];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Set MONGODB_URI or USE_IN_MEMORY_DB - run backend once first');
    process.exit(1);
  }
  await mongoose.connect(uri);
  await Design.deleteMany({ title: { $in: samples.map((s) => s.title) } } });
  for (const s of samples) {
    await Design.create({
      ...s,
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(s.title)}/400/500`,
      isPublic: true,
    });
  }
  console.log(`Seeded ${samples.length} designs`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
