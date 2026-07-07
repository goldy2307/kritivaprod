const nodemailer = require('nodemailer');
const { renderEmail } = require('./emailTemplate');

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE) === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
}

async function sendMail({ to, subject, heading, bodyLines, ctaText, ctaUrl, bannerUrl, attachments }) {
  const html = renderEmail({ heading: heading || subject, bodyLines: bodyLines || [], ctaText, ctaUrl, bannerUrl });
  return getTransporter().sendMail({
    from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_EMAIL}>`,
    to, subject, html, attachments
  });
}

module.exports = { sendMail, getTransporter };
