const router = require('express').Router();
const Booking = require('../models/Booking');
const Banner = require('../models/Banner');
const { sendMail } = require('../utils/mailer');

// Create booking (from site form)
router.post('/bookings', async (req, res) => {
  try {
    const { name, phone, email, planType, passes, day, message } = req.body;
    if (!name || !phone || !planType) return res.status(400).json({ error: 'name, phone, planType required' });

    const booking = await Booking.create({ name, phone, email, planType, passes, day, message, source: 'website' });

    // Fire-and-forget emails (don't block response on mail failures)
    sendMail({
      to: email || process.env.ADMIN_NOTIFY_EMAIL,
      subject: 'We received your request — Royal Garba Nights 2026',
      heading: 'Thank You For Reaching Out',
      bodyLines: [
        `Dear ${name},`,
        `We have received your enquiry for <b>${planType}</b> (${passes || 1} pass${(passes||1)>1?'es':''}) at Royal Garba Nights 2026.`,
        `Our team will connect with you within 24 hours to confirm the details and next steps.`,
        `For anything urgent, call us directly at +91 92325 32246 or reply on WhatsApp.`
      ],
      ctaText: 'Visit Website',
      ctaUrl: process.env.SITE_URL
    }).catch(()=>{});

    sendMail({
      to: process.env.ADMIN_NOTIFY_EMAIL,
      subject: `New Booking Enquiry: ${name} (${planType})`,
      heading: 'New Booking Received',
      bodyLines: [
        `Name: ${name}`, `Phone: ${phone}`, `Email: ${email || '-'}`,
        `Plan: ${planType}`, `Passes: ${passes || 1}`, `Day: ${day || 'All 3 Days'}`,
        `Message: ${message || '-'}`
      ]
    }).catch(()=>{});

    res.status(201).json({ ok: true, id: booking._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Active promo banner for homepage
router.get('/banners/active', async (req, res) => {
  const banner = await Banner.findOne({ active: true, placement: 'promo-section' }).sort({ createdAt: -1 });
  if (!banner) return res.status(404).json({});
  res.json({ url: `${req.protocol}://${req.get('host')}${banner.url}`, title: banner.title });
});

module.exports = router;
