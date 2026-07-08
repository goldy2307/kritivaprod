const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  eventTitle: { type: String, trim: true }, // denormalized so history survives event edits/deletes
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  planType: { type: String, required: true }, // package name chosen, or "General Enquiry"
  passes: { type: Number, default: 1 },
  day: { type: String, default: 'All 3 Days' },
  message: { type: String },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },

  unitPrice: { type: Number, default: 0 },   // predefined price at time of booking (per pass/unit)
  couponCode: { type: String, trim: true, uppercase: true },
  discountAmount: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },      // final payable amount (admin/system can override)
  amountIsManualOverride: { type: Boolean, default: false },

  invoiceNumber: { type: String },
  invoiceGeneratedAt: { type: Date },
  source: { type: String, default: 'website' }, // website / whatsapp / call / manual
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);