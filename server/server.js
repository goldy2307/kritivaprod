require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const { verifyMailer } = require('./utils/mailer');
const { CLOUDINARY_ENABLED } = require('./utils/cloudinary');

// Defensive: make sure upload dirs exist even if git/deploy dropped empty folders.
['banners', 'invoices', 'profiles', 'events'].forEach(dir => {
  fs.mkdirSync(path.join(__dirname, 'uploads', dir), { recursive: true });
});

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));

// Static: public site
app.use(express.static(path.join(__dirname, '..', 'public')));
// Static: uploaded banners / invoices
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Block search engines from the admin path
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send('User-agent: *\nDisallow: /admin\nDisallow: /api/admin\n\nSitemap: https://kritivaproductions.com/sitemap.xml\n');
});

// API routes
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// Admin SPA (serves login + dashboard; client-side JS enforces auth for dashboard views)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'index.html'));
});
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'index.html'));
});

// Fallback to main site for any other route (SPA-ish, optional)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Kritiva server running on port ${PORT}`));

    console.log(CLOUDINARY_ENABLED ? 'Cloudinary: configured' : 'Cloudinary: NOT configured (image uploads will fall back to local disk and may not survive redeploys)');
    verifyMailer()
      .then(() => console.log('SMTP: connection verified, mail should send fine'))
      .catch(err => console.error('SMTP: verification FAILED —', err.message, '(this is almost certainly why invoice/booking emails are not sending — check SMTP_HOST/PORT/SECURE/USER/PASS in .env)'));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });