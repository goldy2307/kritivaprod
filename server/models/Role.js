const mongoose = require('mongoose');
const Admin = require('./Admin');

// Custom back-office roles. The 'admin' role is a built-in super-role (full
// access, see middleware/auth.js) and is NOT stored here.
const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true }, // e.g. "back-office", "event-manager"
  label: { type: String, trim: true },   // display label, defaults to name
  permissions: { type: [String], enum: Admin.PERMISSIONS, default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Role', roleSchema);