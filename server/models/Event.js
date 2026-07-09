const mongoose = require('mongoose');

// Optional bookable packages/tiers for an event (e.g. Family Pass, Gold Sponsor).
// Leave empty for a plain "General Enquiry" event with no fixed pricing.
const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },     // e.g. "Family Pass", "Gold Sponsor"
  price: { type: Number, default: 0 },         // per-unit price, INR
  passes: { type: Number, default: 1 }         // passes included per unit (informational)
}, { _id: false });

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: { type: String, default: 'General', trim: true }, // Navratri/Garba, Holi, Corporate Gala, Wedding, Birthday, Other...
  tagline: { type: String, trim: true },
  description: { type: String, trim: true },
  dateLabel: { type: String, trim: true },     // display string, e.g. "17-19 Oct 2026"
  startDate: { type: Date },
  endDate: { type: Date },
  location: { type: String, trim: true },
  image: { type: String },                     // Cloudinary secure_url (or /uploads/events/xxx.jpg legacy)
  imageCloudinaryId: { type: String },
  packages: { type: [packageSchema], default: [] },
  status: { type: String, enum: ['upcoming', 'past', 'draft'], default: 'upcoming' },
  listed: { type: Boolean, default: true },    // shown on the public site / bookable via Reserve Now
  order: { type: Number, default: 0 },         // lower = shown first
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);