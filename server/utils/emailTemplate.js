// Builds a premium, black-and-gold HTML email matching the brand.
// bannerUrl should be a full public URL (e.g. https://yourdomain.com/uploads/banners/xxx.jpg)
function renderEmail({ heading, bodyLines = [], ctaText, ctaUrl, bannerUrl, footerNote }) {
  const bodyHtml = bodyLines.map(l => `<p style="margin:0 0 14px 0;color:#cfc6b3;font-size:15px;line-height:1.7;font-family:Georgia,'Times New Roman',serif;">${l}</p>`).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0705;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0705;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#120d09;border:1px solid #d4af37;border-radius:8px;overflow:hidden;">

        <!-- top gold rule -->
        <tr><td style="height:4px;background:linear-gradient(90deg,#8b6914,#f4e4bc,#8b6914);background-color:#d4af37;"></td></tr>

        <!-- banner (optional) -->
        ${bannerUrl ? `<tr><td><img src="${bannerUrl}" width="600" style="display:block;width:100%;height:auto;" alt="Kritiva Productions"></td></tr>` : ''}

        <!-- logo/header -->
        <tr><td style="padding:36px 40px 10px 40px;text-align:center;">
          <div style="font-family:Georgia,serif;letter-spacing:4px;color:#d4af37;font-size:13px;text-transform:uppercase;">Kritiva Productions</div>
          <div style="font-family:Georgia,serif;color:#f4e4bc;font-size:12px;font-style:italic;margin-top:4px;">Where We Celebrate</div>
        </td></tr>

        <tr><td style="padding:20px 40px;text-align:center;">
          <h1 style="font-family:Georgia,serif;color:#f4e4bc;font-size:26px;margin:0 0 20px 0;font-weight:normal;">${heading}</h1>
          <div style="text-align:left;">${bodyHtml}</div>
        </td></tr>

        ${ctaText && ctaUrl ? `
        <tr><td style="padding:0 40px 30px 40px;text-align:center;">
          <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#f4e4bc,#d4af37 60%,#8b6914);color:#1a1206;text-decoration:none;padding:14px 32px;border-radius:3px;font-family:Arial,sans-serif;font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:bold;">${ctaText}</a>
        </td></tr>` : ''}

        <tr><td style="padding:0 40px 30px 40px;text-align:center;border-top:1px solid rgba(212,175,55,0.2);padding-top:24px;">
          <p style="font-family:Arial,sans-serif;color:#8a8272;font-size:12px;line-height:1.6;margin:0;">
            ${footerNote || 'Royal Garba Nights 2026 &middot; 17-18-19 Oct &middot; Blue Lotus, Indore'}
          </p>
          <p style="font-family:Arial,sans-serif;color:#6b6355;font-size:11px;margin-top:14px;">
            615, 6th Floor, Shekhar Central, Palasia, Indore, MP &middot; +91 92325 32246 &middot; kritivaproductions@gmail.com
          </p>
        </td></tr>

        <tr><td style="height:4px;background-color:#d4af37;"></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { renderEmail };
