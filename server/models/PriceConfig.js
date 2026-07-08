const mongoose = require('mongoose');

// One document per bookable plan type. planType values must match the
// options used on the booking form / sponsorship tiers.
const priceConfigSchema = new mongoose.Schema({
  planType: { type: String, required: true, unique: true }, // e.g. "Family Pass", "Gold Sponsor"
  price: { type: Number, required: true, default: 0 }, // price per single pass/unit, INR
  label: { type: String }, // display label shown on site, defaults to planType
  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PriceConfig', priceConfigSchema);
