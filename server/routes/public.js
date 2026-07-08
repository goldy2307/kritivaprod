const router = require('express').Router();
const Booking = require('../models/Booking');
const Banner = require('../models/Banner');
const PriceConfig = require('../models/PriceConfig');
const Coupon = require('../models/Coupon');
const { sendMail } = require('../utils/mailer');

/* ---------- Pricing (public, read-only) ---------- */
router.get('/pricing', async (req, res) => {
  const prices = await PriceConfig.find({ active: true }).sort({ price: 1 });
  res.json(prices);
});

/* ---------- Coupon validation (public) ---------- */
router.post('/coupons/validate', async (req, res) => {
  const { code, planType } = req.body;
  if (!code) return res.status(400).json({ valid: false, error: 'Code required' });
  const coupon = await Coupon.findOne({ code: String(code).toUpperCase(), active: true });
  if (!coupon) return res.json({ valid: false, error: 'Invalid or inactive coupon' });
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return res.json({ valid: false, error: 'Coupon expired' });
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return res.json({ valid: false, error: 'Coupon usage limit reached' });
  if (coupon.applicablePlans.length && planType && !coupon.applicablePlans.includes(planType)) {
    return res.json({ valid: false, error: 'Coupon not applicable to this plan' });
  }
  res.json({ valid: true, discountType: coupon.discountType, value: coupon.value });
});

/* ---------- Create booking ---------- */
router.post('/bookings', async (req, res) => {
  try {
    const { name, phone, email, planType, passes, day, message, couponCode } = req.body;
    if (!name || !phone || !planType) return res.status(400).json({ error: 'name, phone, planType required' });

    const passCount = Number(passes) || 1;

    // Predefined price lookup
    const priceDoc = await PriceConfig.findOne({ planType });
    const unitPrice = priceDoc ? priceDoc.price : 0;
    let amount = unitPrice * passCount;
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase(), active: true });
      if (coupon && (!coupon.expiresAt || coupon.expiresAt >= new Date()) &&
          (!coupon.maxUses || coupon.usedCount < coupon.maxUses) &&
          (!coupon.applicablePlans.length || coupon.applicablePlans.includes(planType))) {
        discountAmount = coupon.discountType === 'flat' ? coupon.value : Math.round(amount * (coupon.value / 100));
        discountAmount = Math.min(discountAmount, amount);
        amount = amount - discountAmount;
        appliedCoupon = coupon;
      }
    }

    const booking = await Booking.create({
      name, phone, email, planType, passes: passCount, day, message,
      unitPrice, amount, discountAmount,
      couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      source: 'website'
    });

    if (appliedCoupon) {
      appliedCoupon.usedCount += 1;
      await appliedCoupon.save();
    }

    // Emails: awaited + logged so failures are visible in server logs (Render "Logs" tab).
    try {
      await sendMail({
        to: email || process.env.ADMIN_NOTIFY_EMAIL,
        subject: 'We received your request — Royal Garba Nights 2026',
        heading: 'Thank You For Reaching Out',
        bodyLines: [
          `Dear ${name},`,
          `We have received your enquiry for <b>${planType}</b> (${passCount} pass${passCount > 1 ? 'es' : ''}) at Royal Garba Nights 2026.`,
          amount ? `Estimated amount: <b>Rs. ${amount.toLocaleString('en-IN')}</b>${discountAmount ? ` (after coupon discount of Rs. ${discountAmount.toLocaleString('en-IN')})` : ''}.` : '',
          `Our team will connect with you within 24 hours to confirm the details and next steps.`,
          `For anything urgent, call us directly at +91 92325 32246 or reply on WhatsApp.`
        ].filter(Boolean),
        ctaText: 'Visit Website',
        ctaUrl: process.env.SITE_URL
      });
    } catch (mailErr) {
      console.error('MAIL ERROR (customer confirmation):', mailErr.message);
    }

    try {
      await sendMail({
        to: process.env.ADMIN_NOTIFY_EMAIL,
        subject: `New Booking Enquiry: ${name} (${planType})`,
        heading: 'New Booking Received',
        bodyLines: [
          `Name: ${name}`, `Phone: ${phone}`, `Email: ${email || '-'}`,
          `Plan: ${planType}`, `Passes: ${passCount}`, `Day: ${day || 'All 3 Days'}`,
          `Amount: Rs. ${amount.toLocaleString('en-IN')}${appliedCoupon ? ` (coupon ${appliedCoupon.code} applied)` : ''}`,
          `Message: ${message || '-'}`
        ]
      });
    } catch (mailErr) {
      console.error('MAIL ERROR (admin notify):', mailErr.message);
    }

    res.status(201).json({ ok: true, id: booking._id, amount, discountAmount });
  } catch (err) {
    console.error('BOOKING ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ---------- Active banners, optionally filtered by placement ---------- */
router.get('/banners/active', async (req, res) => {
  const { placement } = req.query;
  const filter = { active: true };
  if (placement) filter.placement = placement;
  const banners = await Banner.find(filter).sort({ createdAt: -1 });
  if (!placement) {
    // return all active banners grouped by placement for the homepage to consume
    const grouped = {};
    banners.forEach(b => {
      grouped[b.placement] = grouped[b.placement] || [];
      grouped[b.placement].push({ url: `${req.protocol}://${req.get('host')}${b.url}`, title: b.title, linkUrl: b.linkUrl });
    });
    return res.json(grouped);
  }
  const banner = banners[0];
  if (!banner) return res.status(404).json({});
  res.json({ url: `${req.protocol}://${req.get('host')}${banner.url}`, title: banner.title, linkUrl: banner.linkUrl });
});

module.exports = router;
