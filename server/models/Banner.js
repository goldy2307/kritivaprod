const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: { type: String },
  url: { type: String, required: true }, // /uploads/banners/xxx.jpg
  placement: { type: String, enum: ['promo-section', 'hero-strip'], default: 'promo-section' },
  active: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Banner', bannerSchema);
