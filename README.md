# Kritiva Productions — Site + Admin

Stack: Node/Express + MongoDB + vanilla JS/Three.js/GSAP frontend. No build step needed for frontend (plain HTML).

## Structure
```
kritiva/
  public/index.html        -> main site (3D bg, scroll animations, booking form)
  public/admin/index.html  -> admin dashboard (login-gated, NOT linked from main site)
  server/                  -> Express API + Mongo models
  .env.example             -> copy to .env and fill in
```

## Setup
```
npm install
cp .env.example .env      # fill Mongo URI, JWT secret, SMTP creds
npm run seed:admin        # creates first admin login from .env values
npm start                 # or: pm2 start server/server.js --name kritiva
```

## What's new in this update
- Fixed mail sending: booking confirmation + admin notify emails now `await` and `console.error()` on failure instead of swallowing silently — check your Render/PM2 logs, not the browser console, for mail issues.
- Fixed 3D background: three.js r160 has no global `<script>` build, was causing `THREE is not defined`. Locked to r128.
- Forgot password: math captcha → OTP emailed **only** to `kritivaproductions@gmail.com` (hardcoded in `admin.js`, not the requesting user's own email) → username+OTP+new password resets it. Also added a logged-in "Change Password" (needs current password).
- Predefined pricing: `PriceConfig` collection drives sponsorship tier prices on the site AND auto-fills the amount on both the public booking form and admin manual-entry form. Admin can still override per-booking.
- Discount coupons: create flat/percent codes, optional per-plan restriction, max uses, expiry. Public site validates + applies live on the booking form; admin can manage from the dashboard.
- Banners: 5 placements now (hero-strip, promo-section, venue-section, sponsorship-section, footer-strip), each with its own suggested size and an optional click-through link.
- Employee/user management: add staff with name, username, mobile, email, password, profile photo, role. `admin` role = full access always. `back-office` role = pick specific permissions (bookings/banners/pricing/coupons/mail/users) via checkboxes, enforced server-side in every admin route via `requirePermission()`.
- Run `npm run seed:admin` again after pulling this update — it now also seeds default prices for each plan type (edit them from the Pricing tab afterward).

## What's new (this update)
- **Cloudinary for image uploads** — banners, event covers, and profile photos now upload straight to Cloudinary instead of local disk. This is the fix for "uploaded banners disappear": Hostinger/most PaaS hosts wipe `server/uploads/*` on every redeploy/restart since it's not part of the git-tracked build, so anything saved there only survives until the next deploy. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `.env` (free tier is enough). If these are left blank the server still boots, but new image uploads will fail — check the startup log line ("Cloudinary: configured" / "NOT configured").
- **Banner display bug fixed** — the public banner endpoint used to always rebuild the image URL from `req.protocol` + host, which silently downgraded to `http://` behind a reverse proxy that doesn't forward `X-Forwarded-Proto`, and the browser then blocked it as mixed content. Cloudinary URLs are absolute + https already, so this class of bug is gone for anything uploaded from now on.
- **QR code fixed** — was calling `api.qrserver.com` client-side; if that domain was slow/blocked (ad-blockers commonly block "qr" generator domains) the box stayed empty. Now generated locally with `qrcode.js` (cdnjs), with a text-link fallback if the script itself fails to load.
- **Booking actions overhauled** — table now has a *Payment Status* column (unpaid/partial/paid/refunded) separate from booking status (pending/confirmed/cancelled). Actions column: **View** (opens a print-friendly booking detail page — use the browser's Print → Save as PDF), **Edit** (full field edit incl. status + payment status), **Invoice** (generate/download, optional email), **Mail Invoice** (re-send an already-generated invoice without regenerating it), **Delete**.
- **Mail sending diagnostics** — `sendMail()` now throws a specific error if `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` are missing instead of failing deep inside nodemailer. Server startup now calls `transporter.verify()` and logs exactly why SMTP is broken (bad host/port/secure mismatch, bad auth, etc). The admin UI now surfaces the *actual* mail error (e.g. "Invalid login: 535-5.7.8" for a bad Gmail app password) instead of a generic "failed". If you're on Gmail: use an **App Password** (not your normal password), `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true` — or `SMTP_PORT=587`, `SMTP_SECURE=false`.
- **Banner edit** — banners can now be edited in place (title/placement/link, optionally swap the image) instead of delete-and-reupload.
- **Hero section CMS** — new "Hero Section" admin tab controls the homepage hero: title lines, subtitle, date/location badges, primary button text+link, WhatsApp button visibility, and background style (default / solid dark / gold gradient / custom image). Public homepage fetches `/api/hero` and overrides the hardcoded defaults only for fields that are actually set.
- **Event edit** — events can now be edited (all fields + packages + swap cover image), not just hidden/deleted.
- **User edit** — employees can be edited (name/mobile/email/role/permissions/profile photo) and have their password reset directly from Manage Users, not just disabled/deleted.
- **Role edit** — role label and permission set can be edited in place; changes propagate to every user on that role immediately (as before).
- **My Profile** — new self-service tab for the logged-in admin/employee to view all their own account details and edit name/mobile/email/profile photo.

## Cloudinary setup
1. Create a free account at cloudinary.com, grab Cloud Name / API Key / API Secret from the console dashboard.
2. Put them in `.env` as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. Restart the server. Check the log for "Cloudinary: configured".
4. Existing images already on local disk (`server/uploads/*`) keep working via the legacy `/uploads/...` path — nothing breaks — but re-upload/re-save them once (edit banner/event/profile and pick a new file) to migrate to Cloudinary so they survive future redeploys.


- URL: `https://yourdomain.com/admin`
- Not in nav, not in sitemap, blocked in robots.txt. Still gate it further at
  Hostinger/Nginx level with HTTP Basic Auth on `/admin` if you want a second layer.
- Roles: `admin`, `back-office` (set in Admin model / seed script).
- To add more admin/back-office users: insert into Mongo `admins` collection with
  a bcrypt hash, or extend seedAdmin.js.

## What's wired up
- Booking form -> `POST /api/bookings` -> saves to Mongo, emails customer + you.
- WhatsApp buttons -> `wa.me/919232532246` with prefilled message (edit number in index.html `WA_NUMBER`).
- Call buttons -> `tel:` links.
- Instant estimate calculator -> pure front-end, no backend needed.
- Admin dashboard:
  - Bookings: search/filter, change status, generate + email PDF invoice.
  - Banners: upload promo image (shown on homepage promo-section), suggested size 1600x600px.
  - Send Mail: compose one-off premium branded emails to any lead.
- Emails use `server/utils/emailTemplate.js` (black/gold branded HTML, banner-ready).

## SMTP
Use your Hostinger business email SMTP (smtp.hostinger.com, port 465) or any provider.
Fill SMTP_* vars in .env.

## Deploy on Hostinger + PM2 (matches your existing setup)
1. Upload the whole `kritiva/` folder.
2. `npm install --production`
3. Set `.env` on server.
4. `npm run seed:admin` once.
5. `pm2 start server/server.js --name kritiva-site`
6. Point domain to the Node port (5000) via Hostinger's Node.js app / reverse proxy config,
   same as your other Express deployments.

## Notes / things you should sanity-check before going live
- Phone number and email in the site are pulled straight from your brochure — confirm they're correct.
- `CORS_ORIGINS` in .env must include your real domain or booking form fetch calls will fail.
- Invoice PDFs and banner uploads are stored on local disk (`server/uploads/`) — back these up,
  shared hosting can wipe them on redeploy. Consider Cloudinary if you want it persistent (you already use it for KYC docs on the other project).
- No rate-limiting on `/api/bookings` yet — add `express-rate-limit` before launch if you expect bot traffic.
