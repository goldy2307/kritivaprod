const mongoose = require('mongoose');

const PERMISSIONS = ['bookings', 'banners', 'pricing', 'coupons', 'mail', 'users'];

const adminSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  email: { type: String, trim: true },
  mobile: { type: String, trim: true },
  profileImage: { type: String }, // /uploads/profiles/xxx.jpg
  role: { type: String, enum: ['admin', 'back-office'], default: 'back-office' },
  // Only meaningful for role = back-office. 'admin' role always has full access at the middleware level.
  permissions: { type: [String], enum: PERMISSIONS, default: [] },
  active: { type: Boolean, default: true },
  resetOtpHash: { type: String },
  resetOtpExpires: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', adminSchema);
Admin.PERMISSIONS = PERMISSIONS;
module.exports = Admin;
