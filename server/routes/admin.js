const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const Admin = require('../models/Admin');
const Booking = require('../models/Booking');
const Banner = require('../models/Banner');
const PriceConfig = require('../models/PriceConfig');
const Coupon = require('../models/Coupon');
const Event = require('../models/Event');
const Role = require('../models/Role');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');
const { generateInvoicePDF } = require('../utils/invoice');
const { generateCaptcha, verifyCaptcha } = require('../utils/captcha');

const FIXED_RESET_EMAIL = 'kritivaproductions@gmail.com'; // OTP always goes here, never to the requesting user's own inbox.

function signToken(admin) {
  return jwt.sign(
    { id: admin._id, username: admin.username, role: admin.role, permissions: admin.permissions || [] },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '7d' }
  );
}

/* ================= AUTH ================= */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username, active: true });
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken(admin);
  res.json({
    token,
    admin: {
      username: admin.username, role: admin.role, permissions: admin.permissions,
      name: admin.name, profileImage: admin.profileImage
    }
  });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword required' });
  const admin = await Admin.findById(req.admin.id);
  if (!admin) return res.status(404).json({ error: 'Not found' });
  const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Current password incorrect' });
  admin.passwordHash = await bcrypt.hash(newPassword, 10);
  await admin.save();
  res.json({ ok: true });
});

/* ---- Forgot password: math captcha -> OTP sent ONLY to kritivaproductions@gmail.com -> reset ---- */
router.get('/forgot-password/captcha', (req, res) => {
  res.json(generateCaptcha());
});

router.post('/forgot-password/request', async (req, res) => {
  try {
    const { username, captchaId, captchaAnswer } = req.body;
    if (!username || !captchaId || captchaAnswer === undefined) {
      return res.status(400).json({ error: 'username, captchaId, captchaAnswer required' });
    }
    if (!verifyCaptcha(captchaId, captchaAnswer)) {
      return res.status(400).json({ error: 'Incorrect captcha answer' });
    }
    const admin = await Admin.findOne({ username, active: true });
    if (!admin) return res.json({ ok: true }); // don't leak which usernames exist

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    admin.resetOtpHash = await bcrypt.hash(otp, 10);
    admin.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await admin.save();

    sendMail({
      to: FIXED_RESET_EMAIL,
      subject: `Password Reset OTP — ${admin.username}`,
      heading: 'Admin Password Reset Requested',
      bodyLines: [
        `A password reset was requested for the account: <b>${admin.username}</b> (${admin.role}).`,
        `OTP: <b style="font-size:22px;letter-spacing:4px;">${otp}</b>`,
        `This OTP expires in 10 minutes. If this wasn't requested by your team, ignore this email and consider disabling that account.`
      ]
    }).catch(err => console.error('MAIL ERROR (reset OTP):', err.message));

    res.json({ ok: true });
  } catch (err) {
    console.error('FORGOT PASSWORD ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { username, otp, newPassword } = req.body;
    if (!username || !otp || !newPassword) return res.status(400).json({ error: 'username, otp, newPassword required' });
    const admin = await Admin.findOne({ username, active: true });
    if (!admin || !admin.resetOtpHash || !admin.resetOtpExpires) return res.status(400).json({ error: 'No reset in progress for this user' });
    if (admin.resetOtpExpires < new Date()) return res.status(400).json({ error: 'OTP expired, request a new one' });
    const ok = await bcrypt.compare(otp, admin.resetOtpHash);
    if (!ok) return res.status(400).json({ error: 'Incorrect OTP' });

    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    admin.resetOtpHash = undefined;
    admin.resetOtpExpires = undefined;
    await admin.save();
    res.json({ ok: true });
  } catch (err) {
    console.error('RESET PASSWORD ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ================= DASHBOARD STATS ================= */
router.get('/stats', requireAuth, async (req, res) => {
  const total = await Booking.countDocuments();
  const pending = await Booking.countDocuments({ status: 'pending' });
  const confirmed = await Booking.countDocuments({ status: 'confirmed' });
  const passesAgg = await Booking.aggregate([{ $group: { _id: null, passes: { $sum: '$passes' } } }]);
  const revenueAgg = await Booking.aggregate([{ $match: { status: 'confirmed' } }, { $group: { _id: null, amount: { $sum: '$amount' } } }]);
  res.json({
    total, pending, confirmed,
    totalPasses: passesAgg[0]?.passes || 0,
    confirmedRevenue: revenueAgg[0]?.amount || 0
  });
});

/* ================= BOOKINGS ================= */
router.get('/bookings', requireAuth, requirePermission('bookings'), async (req, res) => {
  const { status, planType, q } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (planType) filter.planType = planType;
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { phone: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
  const bookings = await Booking.find(filter).sort({ createdAt: -1 });
  res.json(bookings);
});

router.post('/bookings', requireAuth, requirePermission('bookings'), async (req, res) => {
  const { name, phone, email, planType, passes, day, message, amount } = req.body;
  if (!name || !phone || !planType) return res.status(400).json({ error: 'name, phone, planType required' });
  const passCount = Number(passes) || 1;
  const priceDoc = await PriceConfig.findOne({ planType });
  const unitPrice = priceDoc ? priceDoc.price : 0;
  const finalAmount = amount !== undefined ? Number(amount) : unitPrice * passCount;
  const booking = await Booking.create({
    name, phone, email, planType, passes: passCount, day, message,
    unitPrice, amount: finalAmount, amountIsManualOverride: amount !== undefined,
    source: 'manual'
  });
  res.status(201).json(booking);
});

router.patch('/bookings/:id', requireAuth, requirePermission('bookings'), async (req, res) => {
  const { status, amount } = req.body;
  const update = {};
  if (status) update.status = status;
  if (amount !== undefined) { update.amount = amount; update.amountIsManualOverride = true; }
  const booking = await Booking.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!booking) return res.status(404).json({ error: 'Not found' });
  res.json(booking);
});

router.delete('/bookings/:id', requireAuth, requirePermission('bookings'), async (req, res) => {
  await Booking.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

/* ---------- Invoice generation ---------- */
router.post('/bookings/:id/invoice', requireAuth, requirePermission('bookings'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (req.body.amount !== undefined) { booking.amount = req.body.amount; booking.amountIsManualOverride = true; }
    if (!booking.invoiceNumber) booking.invoiceNumber = `KP-INV-${Date.now()}`;

    const { filePath, filename, invoiceNumber } = await generateInvoicePDF(booking);
    booking.invoiceGeneratedAt = new Date();
    await booking.save();

    let emailed = false;
    if (booking.email && req.body.sendEmail) {
      try {
        await sendMail({
          to: booking.email,
          subject: `Your Invoice — ${invoiceNumber}${booking.eventTitle ? ` | ${booking.eventTitle}` : ''}`,
          heading: 'Invoice Attached',
          bodyLines: [
            `Dear ${booking.name},`,
            `Please find attached your invoice <b>${invoiceNumber}</b> for ${booking.planType}${booking.eventTitle ? ` — ${booking.eventTitle}` : ''}.`,
            `We look forward to celebrating with you.`
          ],
          attachments: [{ filename, path: filePath }]
        });
        emailed = true;
      } catch (mailErr) {
        console.error('MAIL ERROR (invoice):', mailErr.message);
      }
    }

    res.json({ ok: true, invoiceNumber, downloadUrl: `/uploads/invoices/${filename}`, emailed });
  } catch (err) {
    console.error('INVOICE ERROR:', err);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

/* ================= PRICING ================= */
router.get('/pricing', requireAuth, requirePermission('pricing'), async (req, res) => {
  const prices = await PriceConfig.find().sort({ planType: 1 });
  res.json(prices);
});

router.put('/pricing', requireAuth, requirePermission('pricing'), async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : req.body.items;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Expected an array of {planType, price}' });
  const results = [];
  for (const item of items) {
    if (!item.planType) continue;
    const doc = await PriceConfig.findOneAndUpdate(
      { planType: item.planType },
      { price: Number(item.price) || 0, label: item.label, active: item.active !== false, updatedAt: new Date() },
      { new: true, upsert: true }
    );
    results.push(doc);
  }
  res.json(results);
});

router.delete('/pricing/:id', requireAuth, requirePermission('pricing'), async (req, res) => {
  await PriceConfig.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

/* ================= COUPONS ================= */
router.get('/coupons', requireAuth, requirePermission('coupons'), async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json(coupons);
});

router.post('/coupons', requireAuth, requirePermission('coupons'), async (req, res) => {
  try {
    const { code, discountType, value, applicablePlans, maxUses, expiresAt } = req.body;
    if (!code || !value) return res.status(400).json({ error: 'code and value required' });
    const coupon = await Coupon.create({
      code: String(code).toUpperCase(),
      discountType: discountType || 'percent',
      value: Number(value),
      applicablePlans: applicablePlans || [],
      maxUses: Number(maxUses) || 0,
      expiresAt: expiresAt || undefined
    });
    res.status(201).json(coupon);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Coupon code already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/coupons/:id', requireAuth, requirePermission('coupons'), async (req, res) => {
  const { active, value, maxUses, expiresAt } = req.body;
  const update = {};
  if (active !== undefined) update.active = active;
  if (value !== undefined) update.value = value;
  if (maxUses !== undefined) update.maxUses = maxUses;
  if (expiresAt !== undefined) update.expiresAt = expiresAt;
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, update, { new: true });
  res.json(coupon);
});

router.delete('/coupons/:id', requireAuth, requirePermission('coupons'), async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

/* ================= EVENTS ================= */
// Powers the homepage "Upcoming Events" section and gates Reserve Now: only
// events created here (and listed=true) can be enquired about on the site.
const eventStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'events');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
});
const uploadEventImage = multer({ storage: eventStorage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/events', requireAuth, requirePermission('events'), async (req, res) => {
  const events = await Event.find().sort({ order: 1, createdAt: -1 });
  res.json(events);
});

router.post('/events', requireAuth, requirePermission('events'), uploadEventImage.single('image'), async (req, res) => {
  try {
    let packages = [];
    try { packages = JSON.parse(req.body.packages || '[]'); } catch (_) {}
    const event = await Event.create({
      title: req.body.title,
      category: req.body.category || 'General',
      tagline: req.body.tagline,
      description: req.body.description,
      dateLabel: req.body.dateLabel,
      startDate: req.body.startDate || undefined,
      endDate: req.body.endDate || undefined,
      location: req.body.location,
      image: req.file ? `/uploads/events/${req.file.filename}` : undefined,
      packages,
      status: req.body.status || 'upcoming',
      listed: req.body.listed !== undefined ? (req.body.listed === 'true' || req.body.listed === true) : true,
      order: Number(req.body.order) || 0
    });
    res.status(201).json(event);
  } catch (err) {
    console.error('EVENT CREATE ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/events/:id', requireAuth, requirePermission('events'), uploadEventImage.single('image'), async (req, res) => {
  try {
    const update = {};
    ['title', 'category', 'tagline', 'description', 'dateLabel', 'location', 'status'].forEach(f => {
      if (req.body[f] !== undefined) update[f] = req.body[f];
    });
    if (req.body.startDate !== undefined) update.startDate = req.body.startDate || undefined;
    if (req.body.endDate !== undefined) update.endDate = req.body.endDate || undefined;
    if (req.body.order !== undefined) update.order = Number(req.body.order) || 0;
    if (req.body.listed !== undefined) update.listed = req.body.listed === 'true' || req.body.listed === true;
    if (req.body.packages !== undefined) {
      try { update.packages = JSON.parse(req.body.packages); } catch (_) {}
    }
    if (req.file) update.image = `/uploads/events/${req.file.filename}`;

    const event = await Event.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!event) return res.status(404).json({ error: 'Not found' });
    res.json(event);
  } catch (err) {
    console.error('EVENT UPDATE ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/events/:id', requireAuth, requirePermission('events'), async (req, res) => {
  const event = await Event.findByIdAndDelete(req.params.id);
  if (event && event.image) {
    const filePath = path.join(__dirname, '..', event.image);
    fs.unlink(filePath, () => {});
  }
  res.json({ ok: true });
});

/* ================= ROLES ================= */
// Custom back-office roles the "Manage Users" screen can assign. 'admin' is a
// built-in super-role and is not managed here (see middleware/auth.js).
router.get('/roles', requireAuth, requirePermission('roles'), async (req, res) => {
  const roles = await Role.find().sort({ name: 1 });
  res.json({ roles, permissions: Admin.PERMISSIONS });
});

router.post('/roles', requireAuth, requirePermission('roles'), async (req, res) => {
  try {
    const { name, label, permissions } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    if (name === 'admin') return res.status(400).json({ error: '"admin" is a reserved built-in role' });
    const role = await Role.create({ name, label: label || name, permissions: permissions || [] });
    res.status(201).json(role);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Role already exists' });
    console.error('ROLE CREATE ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/roles/:id', requireAuth, requirePermission('roles'), async (req, res) => {
  const { label, permissions } = req.body;
  const update = {};
  if (label !== undefined) update.label = label;
  if (permissions !== undefined) update.permissions = permissions;
  const role = await Role.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!role) return res.status(404).json({ error: 'Not found' });
  // Keep already-issued tokens aside: permission changes take effect on next login,
  // but update currently-stored per-user permission snapshots too so the panel stays in sync.
  await Admin.updateMany({ role: role.name }, { permissions: role.permissions });
  res.json(role);
});

router.delete('/roles/:id', requireAuth, requirePermission('roles'), async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) return res.status(404).json({ error: 'Not found' });
  const inUse = await Admin.countDocuments({ role: role.name });
  if (inUse > 0) return res.status(400).json({ error: `Role in use by ${inUse} user(s). Reassign them first.` });
  await Role.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

/* ================= SEND MAIL (custom) ================= */
router.post('/send-mail', requireAuth, requirePermission('mail'), async (req, res) => {
  try {
    const { to, subject, heading, body, ctaText, ctaUrl, bannerUrl } = req.body;
    if (!to || !subject) return res.status(400).json({ error: 'to and subject required' });
    await sendMail({
      to, subject, heading: heading || subject,
      bodyLines: (body || '').split('\n').filter(Boolean),
      ctaText, ctaUrl, bannerUrl
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('MAIL ERROR (custom):', err.message);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

/* ================= BANNERS ================= */
const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'banners');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
});
const uploadBanner = multer({ storage: bannerStorage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/banners', requireAuth, requirePermission('banners'), async (req, res) => {
  const banners = await Banner.find().sort({ createdAt: -1 });
  res.json({ banners, placements: Banner.PLACEMENTS });
});

router.post('/banners', requireAuth, requirePermission('banners'), uploadBanner.single('banner'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const banner = await Banner.create({
    title: req.body.title || '',
    url: `/uploads/banners/${req.file.filename}`,
    placement: req.body.placement || 'promo-section',
    linkUrl: req.body.linkUrl || '',
    active: false
  });
  res.status(201).json(banner);
});

router.patch('/banners/:id/activate', requireAuth, requirePermission('banners'), async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) return res.status(404).json({ error: 'Not found' });
  await Banner.updateMany({ placement: banner.placement }, { active: false });
  banner.active = true;
  await banner.save();
  res.json(banner);
});

router.patch('/banners/:id/deactivate', requireAuth, requirePermission('banners'), async (req, res) => {
  const banner = await Banner.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  res.json(banner);
});

router.delete('/banners/:id', requireAuth, requirePermission('banners'), async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (banner) {
    const filePath = path.join(__dirname, '..', banner.url);
    fs.unlink(filePath, () => {});
  }
  res.json({ ok: true });
});

/* ================= USERS / EMPLOYEES ================= */
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'profiles');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
});
const uploadProfile = multer({ storage: profileStorage, limits: { fileSize: 3 * 1024 * 1024 } });

router.get('/users', requireAuth, requirePermission('users'), async (req, res) => {
  const users = await Admin.find().select('-passwordHash -resetOtpHash').sort({ createdAt: -1 });
  res.json({ users, permissions: Admin.PERMISSIONS });
});

router.post('/users', requireAuth, requirePermission('users'), uploadProfile.single('profileImage'), async (req, res) => {
  try {
    const { name, username, mobile, email, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    let permissions = [];
    try { permissions = JSON.parse(req.body.permissions || '[]'); } catch (_) {}
    const finalRole = role || 'back-office';
    if (finalRole !== 'admin') {
      const roleDoc = await Role.findOne({ name: finalRole });
      if (!roleDoc) return res.status(400).json({ error: `Unknown role "${finalRole}". Create it under Manage Roles first.` });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await Admin.create({
      name, username, mobile, email, passwordHash,
      role: finalRole,
      permissions: finalRole === 'admin' ? [] : permissions,
      profileImage: req.file ? `/uploads/profiles/${req.file.filename}` : undefined
    });
    const safe = user.toObject();
    delete safe.passwordHash;
    res.status(201).json(safe);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Username already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/users/:id', requireAuth, requirePermission('users'), uploadProfile.single('profileImage'), async (req, res) => {
  const { name, mobile, email, role, active, password } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (mobile !== undefined) update.mobile = mobile;
  if (email !== undefined) update.email = email;
  if (active !== undefined) update.active = active === 'true' || active === true;
  if (role) {
    if (role !== 'admin') {
      const roleDoc = await Role.findOne({ name: role });
      if (!roleDoc) return res.status(400).json({ error: `Unknown role "${role}". Create it under Manage Roles first.` });
    }
    update.role = role;
  }
  if (req.body.permissions !== undefined) {
    try { update.permissions = JSON.parse(req.body.permissions); } catch (_) {}
  }
  if (req.file) update.profileImage = `/uploads/profiles/${req.file.filename}`;
  if (password) update.passwordHash = await bcrypt.hash(password, 10);

  const user = await Admin.findByIdAndUpdate(req.params.id, update, { new: true }).select('-passwordHash -resetOtpHash');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

router.delete('/users/:id', requireAuth, requirePermission('users'), async (req, res) => {
  if (req.admin.id === req.params.id) return res.status(400).json({ error: "Can't delete your own account while logged in" });
  await Admin.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;