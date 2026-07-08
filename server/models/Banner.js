const mongoose = require('mongoose');

// Placement maps to a specific slot on the landing page.
const PLACEMENTS = [
  'hero-strip',          // thin strip inside hero section
  'promo-section',       // dedicated promo block (below marketing plan)
  'venue-section',       // inside venue section
  'sponsorship-section', // inside sponsorship tiers section
  'footer-strip'         // above footer
];

const bannerSchema = new mongoose.Schema({
  title: { type: String },
  url: { type: String, required: true }, // /uploads/banners/xxx.jpg
  placement: { type: String, enum: PLACEMENTS, default: 'promo-section' },
  linkUrl: { type: String }, // optional click-through link
  active: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Banner = mongoose.model('Banner', bannerSchema);
Banner.PLACEMENTS = PLACEMENTS;
module.exports = Banner;
