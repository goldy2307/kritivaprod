// Run once: npm run seed:admin
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
const PriceConfig = require('./models/PriceConfig');

const DEFAULT_PRICES = [
  { planType: 'Family Pass', price: 5000, label: 'Family Pass (Entry)' },
  { planType: 'Silver Sponsor', price: 150000, label: 'Silver Sponsor' },
  { planType: 'Gold Sponsor', price: 300000, label: 'Gold Sponsor' },
  { planType: 'Title Sponsor', price: 500000, label: 'Title Sponsor' },
  { planType: 'Stall/Vendor', price: 0, label: 'Stall / Vendor Enquiry' }
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'change_this_password';
  const email = process.env.ADMIN_EMAIL;

  const existing = await Admin.findOne({ username });
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    await Admin.create({ username, passwordHash, email, role: 'admin', name: 'Owner Admin' });
    console.log(`Admin created: ${username}`);
  } else {
    console.log(`Admin "${username}" already exists. Skipping.`);
  }

  for (const p of DEFAULT_PRICES) {
    const existingPrice = await PriceConfig.findOne({ planType: p.planType });
    if (!existingPrice) {
      await PriceConfig.create(p);
      console.log(`Price seeded: ${p.planType} = ₹${p.price}`);
    }
  }

  console.log('Seed complete.');
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
