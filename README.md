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

## Admin access
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
