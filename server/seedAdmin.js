// Run once: npm run seed:admin
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
const PriceConfig = require('./models/PriceConfig');
const Role = require('./models/Role');
const Event = require('./models/Event');

const DEFAULT_PRICES = [
  { planType: 'Family Pass', price: 5000, label: 'Family Pass (Entry)' },
  { planType: 'Silver Sponsor', price: 150000, label: 'Silver Sponsor' },
  { planType: 'Gold Sponsor', price: 300000, label: 'Gold Sponsor' },
  { planType: 'Title Sponsor', price: 500000, label: 'Title Sponsor' },
  { planType: 'Stall/Vendor', price: 0, label: 'Stall / Vendor Enquiry' }
];

const DEFAULT_ROLES = [
  { name: 'back-office', label: 'Back Office', permissions: ['bookings', 'mail'] }
];

// Migrates the original single-event site into the new multi-event model.
// Add more from the Admin Panel > Events tab (Holi, Corporate Galas, etc.)
const DEFAULT_EVENTS = [
  {
    title: 'Royal Garba Nights 2026', category: 'Navratri / Garba',
    tagline: 'An Evening of Culture, Elegance & Tradition',
    dateLabel: '17-18-19 Oct 2026', location: 'Blue Lotus, Indore',
    packages: [
      { name: 'Family Pass', price: 5000, passes: 1 },
      { name: 'Silver Sponsor', price: 150000, passes: 10 },
      { name: 'Gold Sponsor', price: 300000, passes: 15 },
      { name: 'Title Sponsor', price: 500000, passes: 25 }
    ],
    status: 'upcoming', listed: true, order: 0
  }
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

  for (const r of DEFAULT_ROLES) {
    const existingRole = await Role.findOne({ name: r.name });
    if (!existingRole) {
      await Role.create(r);
      console.log(`Role seeded: ${r.name}`);
    }
  }

  for (const e of DEFAULT_EVENTS) {
    const existingEvent = await Event.findOne({ title: e.title });
    if (!existingEvent) {
      await Event.create(e);
      console.log(`Event seeded: ${e.title}`);
    }
  }

  console.log('Seed complete.');
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });