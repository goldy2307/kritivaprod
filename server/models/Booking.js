const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  planType: { type: String, required: true }, // Family Pass / Silver Sponsor / Gold Sponsor / Title Sponsor / Stall-Vendor
  passes: { type: Number, default: 1 },
  day: { type: String, default: 'All 3 Days' },
  message: { type: String },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  amount: { type: Number, default: 0 }, // set by admin when confirming, used for invoice
  invoiceNumber: { type: String },
  invoiceGeneratedAt: { type: Date },
  source: { type: String, default: 'website' }, // website / whatsapp / call / manual
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
