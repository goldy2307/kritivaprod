const mongoose = require('mongoose');

const PERMISSIONS = ['bookings', 'banners', 'pricing', 'coupons', 'mail', 'users', 'events', 'roles'];

const adminSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  email: { type: String, trim: true },
  mobile: { type: String, trim: true },
  profileImage: { type: String }, // /uploads/profiles/xxx.jpg
  // 'admin' is a built-in super-role (full access, see middleware/auth.js).
  // Any other value must match a Role document name (see models/Role.js).
  role: { type: String, default: 'back-office', trim: true },
  // Only meaningful for role != 'admin'. 'admin' role always has full access at the middleware level.
  permissions: { type: [String], enum: PERMISSIONS, default: [] },
  active: { type: Boolean, default: true },
  resetOtpHash: { type: String },
  resetOtpExpires: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', adminSchema);
Admin.PERMISSIONS = PERMISSIONS;
module.exports = Admin;