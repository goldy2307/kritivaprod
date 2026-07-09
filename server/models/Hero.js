const mongoose = require('mongoose');

// Each document is one hero slide. The homepage auto-rotates through every
// `active` slide (sorted by `order`). If none exist/active, the frontend
// falls back to its own hardcoded default slide.
const heroSchema = new mongoose.Schema({
  titleLine1: { type: String, trim: true },   // e.g. "ROYAL"
  titleLine2: { type: String, trim: true },   // e.g. "GARBA NIGHTS"
  subtitle: { type: String, trim: true },     // italic line under the title
  dateBadges: { type: [String], default: [] },// small pill labels, e.g. ["17-19 Oct 2026","Blue Lotus, Indore"]
  primaryCtaText: { type: String, trim: true },
  primaryCtaLink: { type: String, trim: true },
  showWhatsappCta: { type: Boolean, default: true },
  backgroundStyle: { type: String, enum: ['default', 'dark', 'gradient-gold', 'image'], default: 'default' },
  backgroundImage: { type: String, trim: true }, // Cloudinary URL, used when backgroundStyle === 'image'
  backgroundImageCloudinaryId: { type: String },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Hero', heroSchema);
