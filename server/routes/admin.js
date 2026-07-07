const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const Admin = require('../models/Admin');
const Booking = require('../models/Booking');
const Banner = require('../models/Banner');
const { requireAuth } = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');
const { generateInvoicePDF } = require('../utils/invoice');

/* ---------- Auth ---------- */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: admin._id, username: admin.username, role: admin.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d'
  });
  res.json({ token, admin: { username: admin.username, role: admin.role } });
});

/* ---------- Dashboard stats ---------- */
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

/* ---------- Bookings CRUD ---------- */
router.get('/bookings', requireAuth, async (req, res) => {
  const { status, planType, q } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (planType) filter.planType = planType;
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { phone: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
  const bookings = await Booking.find(filter).sort({ createdAt: -1 });
  res.json(bookings);
});

router.patch('/bookings/:id', requireAuth, async (req, res) => {
  const { status, amount } = req.body;
  const update = {};
  if (status) update.status = status;
  if (amount !== undefined) update.amount = amount;
  const booking = await Booking.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!booking) return res.status(404).json({ error: 'Not found' });
  res.json(booking);
});

router.delete('/bookings/:id', requireAuth, async (req, res) => {
  await Booking.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

/* ---------- Invoice generation ---------- */
router.post('/bookings/:id/invoice', requireAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (req.body.amount !== undefined) booking.amount = req.body.amount;
    if (!booking.invoiceNumber) booking.invoiceNumber = `KP-INV-${Date.now()}`;

    const { filePath, filename, invoiceNumber } = await generateInvoicePDF(booking);
    booking.invoiceGeneratedAt = new Date();
    await booking.save();

    let emailed = false;
    if (booking.email && req.body.sendEmail) {
      await sendMail({
        to: booking.email,
        subject: `Your Invoice — ${invoiceNumber} | Royal Garba Nights 2026`,
        heading: 'Invoice Attached',
        bodyLines: [
          `Dear ${booking.name},`,
          `Please find attached your invoice <b>${invoiceNumber}</b> for ${booking.planType}.`,
          `We look forward to celebrating with you at Blue Lotus, Indore.`
        ],
        attachments: [{ filename, path: filePath }]
      });
      emailed = true;
    }

    res.json({ ok: true, invoiceNumber, downloadUrl: `/uploads/invoices/${filename}`, emailed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

/* ---------- Send custom email to a lead ---------- */
router.post('/send-mail', requireAuth, async (req, res) => {
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
    console.error(err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

/* ---------- Banners ---------- */
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads', 'banners'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/banners', requireAuth, async (req, res) => {
  const banners = await Banner.find().sort({ createdAt: -1 });
  res.json(banners);
});

router.post('/banners', requireAuth, upload.single('banner'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const banner = await Banner.create({
    title: req.body.title || '',
    url: `/uploads/banners/${req.file.filename}`,
    placement: req.body.placement || 'promo-section',
    active: false
  });
  res.status(201).json(banner);
});

router.patch('/banners/:id/activate', requireAuth, async (req, res) => {
  // deactivate others in same placement, activate this one
  const banner = await Banner.findById(req.params.id);
  if (!banner) return res.status(404).json({ error: 'Not found' });
  await Banner.updateMany({ placement: banner.placement }, { active: false });
  banner.active = true;
  await banner.save();
  res.json(banner);
});

router.patch('/banners/:id/deactivate', requireAuth, async (req, res) => {
  const banner = await Banner.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  res.json(banner);
});

router.delete('/banners/:id', requireAuth, async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (banner) {
    const filePath = path.join(__dirname, '..', banner.url);
    fs.unlink(filePath, () => {});
  }
  res.json({ ok: true });
});

module.exports = router;
