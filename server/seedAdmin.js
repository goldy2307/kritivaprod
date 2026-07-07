// Run once: npm run seed:admin
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'change_this_password';
  const email = process.env.ADMIN_EMAIL;

  const existing = await Admin.findOne({ username });
  if (existing) {
    console.log(`Admin "${username}" already exists. Skipping.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await Admin.create({ username, passwordHash, email, role: 'admin' });
  console.log(`Admin created: ${username} / (password as set in .env)`);
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
