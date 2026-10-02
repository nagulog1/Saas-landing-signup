# Meshwatch: SaaS Landing Page + Sign-Up Workflow

A conversion-focused landing page for a fictional IoT monitoring product. Visitors sign up, get a verification email (Nodemailer), and land on a thank-you dashboard after clicking the link. Leads are stored in MongoDB and can be viewed or exported from an admin page.

**Stack:** HTML · Tailwind CSS · JavaScript · Node.js · Express · MongoDB (Mongoose) · Nodemailer · JWT cookie session

## The flow

```
Landing page ──> sign-up form ──> POST /api/signup ──> lead saved (unverified)
                                                   └─> verification email sent
"Check your inbox" page  <──────────────────────────┘
Click link in email ──> GET /verify?token=… ──> lead marked verified, API key issued,
                                               welcome email sent, session cookie set
                                          └──> thank-you dashboard (/dashboard.html)
```

## Features

- Landing page: hero with a live fleet demo, features, steps, pricing, FAQ, mobile layout
- Hero email box and pricing buttons carry the visitor straight into the sign-up form with the plan pre-selected
- Form validation in the browser **and** on the server (name, email format, temporary-email domains, fleet size, plan, consent)
- Honeypot field to catch bots without a CAPTCHA
- Verification email with a one-time link (random 256-bit token, only its SHA-256 hash is stored, expires in 24 hours)
- "Check your inbox" page with resend button (60-second cooldown)
- Expired-link page that sends a fresh link
- Welcome email after confirming
- Thank-you dashboard: trial countdown, setup checklist, API key (hide/show/copy), account details
- Leads admin at `/admin.html`: sign-ups, confirmation rate, top traffic source, table, CSV download
- UTM tracking: `/?utm_source=linkedin` is saved with the lead
- Security: rate limiting, httpOnly cookie, same response for new and existing emails (no account enumeration), CSV formula-injection guard, timing-safe admin password check, security headers

## Run it

You need **Node.js 18+**.

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm start
```

Open http://localhost:3000.

### Emails

- **No setup:** leave `SMTP_HOST` empty. The app creates a free [Ethereal](https://ethereal.email) test inbox, and the "Check your inbox" page shows a **Developer preview** button that opens the email. Real inboxes don't receive anything.
- **Real emails with Gmail:** turn on 2-Step Verification, create an App Password at myaccount.google.com/apppasswords, then set in `.env`:
  ```
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=465
  SMTP_USER=you@gmail.com
  SMTP_PASS=your16charapppassword
  MAIL_FROM="Meshwatch <you@gmail.com>"
  ```

### Database

- **No setup:** leave `MONGO_URI` empty for a temporary in-memory MongoDB (data is lost on restart).
- **MongoDB Atlas (free):** paste your connection string into `MONGO_URI`.

### Admin

Go to http://localhost:3000/admin.html and enter `ADMIN_PASSWORD` from `.env` (default `admin123`; change it).

### Before deploying

Set `NODE_ENV=production`, a real `SESSION_SECRET`, `ADMIN_PASSWORD`, `APP_URL` (your public URL), SMTP settings and `MONGO_URI`. In production the developer preview links are never sent to the browser.

## Project structure

```
server.js                  Express app setup
config/db.js               MongoDB connection (in-memory fallback)
models/Lead.js             Lead schema
utils/validate.js          server-side form validation
services/mailer.js         Nodemailer transport (SMTP / Ethereal / console)
services/emailTemplates.js verification, sign-in and welcome emails
middleware/session.js      JWT cookie session
middleware/rateLimit.js    in-memory rate limiter
routes/signup.js           signup, resend, verify, me, logout
routes/admin.js            leads list + CSV export
public/                    landing, check-email, dashboard, link-expired, admin pages
styles/input.css           Tailwind source (run npm run build:css after editing classes)
```

## API

| Method | Route | What it does |
|---|---|---|
| POST | `/api/signup` | Validate, save lead, send verification email |
| POST | `/api/resend` | Send a new link (60 s cooldown) |
| GET | `/verify?token=` | Confirm email, start session, redirect to dashboard |
| GET | `/api/me` | Signed-in lead's dashboard data |
| POST | `/api/logout` | Clear session |
| GET | `/api/admin/leads` | Leads + stats (header `x-admin-key`) |
| GET | `/api/admin/leads.csv` | CSV export (header `x-admin-key`) |
