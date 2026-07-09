const nodemailer = require('nodemailer');
const { renderEmail } = require('./emailTemplate');

let transporter;
function getTransporter() {
  if (!transporter) {
    const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter(k => !process.env[k]);
    if (missing.length) {
      // Fail loud and specific instead of nodemailer's generic ECONNREFUSED/auth
      // error further down the line — this is almost always why "mail just
      // silently doesn't send": one of these env vars is missing or blank.
      throw new Error(`Missing SMTP env vars: ${missing.join(', ')}`);
    }
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE) === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
}

// Verifies SMTP connectivity/auth without sending anything. Call this at
// startup (see server.js) and from the admin "Test Email" diagnostic so
// config problems show up in logs immediately instead of only failing
// silently the first time a real email is triggered.
async function verifyMailer() {
  const t = getTransporter();
  await t.verify();
}

async function sendMail({ to, subject, heading, bodyLines, ctaText, ctaUrl, bannerUrl, attachments }) {
  if (!to) throw new Error('sendMail: "to" address is required');
  const html = renderEmail({ heading: heading || subject, bodyLines: bodyLines || [], ctaText, ctaUrl, bannerUrl });
  return getTransporter().sendMail({
    from: `"${process.env.MAIL_FROM_NAME || 'Kritiva Productions'}" <${process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER}>`,
    to, subject, html, attachments
  });
}

module.exports = { sendMail, getTransporter, verifyMailer };
