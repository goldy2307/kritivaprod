const mongoose = require('mongoose');

// Singleton document (one row, upserted) powering the homepage hero section.
// Any field left blank falls back to the site's hardcoded default on the frontend.
const heroSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true }, // fixed, always 'main'
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
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Hero', heroSchema);
