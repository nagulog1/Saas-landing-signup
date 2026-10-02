const express = require('express');
const crypto = require('crypto');
const Lead = require('../models/Lead');
const { validateSignup } = require('../utils/validate');
const { sendMail, mailMode } = require('../services/mailer');
const { verificationEmail, signInEmail, welcomeEmail } = require('../services/emailTemplates');
const { startSession, endSession, requireSession } = require('../middleware/session');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // verification links work for 24 h
const RESEND_COOLDOWN_MS = 60 * 1000; // at most one email per minute per lead
const TRIAL_DAYS = 14;

const signupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many sign-up attempts. Try again in a few minutes.' });
const resendLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many emails requested. Try again in a few minutes.' });

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const appUrl = () => (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
const isDev = () => process.env.NODE_ENV !== 'production';

function inCooldown(lead) {
  return lead.lastEmailSentAt && Date.now() - new Date(lead.lastEmailSentAt).getTime() < RESEND_COOLDOWN_MS;
}

function secondsLeft(lead) {
  return Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - new Date(lead.lastEmailSentAt).getTime())) / 1000);
}

/**
 * Creates a fresh one-time link for this lead and emails it.
 * New/unverified leads get a "confirm your email" message,
 * already-verified leads get a "sign in" message.
 */
async function sendLinkEmail(lead) {
  const token = crypto.randomBytes(32).toString('hex'); // 256-bit random, unguessable
  lead.verifyTokenHash = sha256(token);
  lead.verifyTokenExpires = new Date(Date.now() + TOKEN_TTL_MS);
  lead.lastEmailSentAt = new Date();
  lead.emailsSent = (lead.emailsSent || 0) + 1;
  await lead.save();

  const verifyUrl = `${appUrl()}/verify?token=${token}`;
  const email = lead.verified ? signInEmail({ name: lead.name, verifyUrl }) : verificationEmail({ name: lead.name, verifyUrl });
  const { previewUrl } = await sendMail({ to: lead.email, ...email });

  // Development helpers so you can finish the flow without a real inbox.
  // Never returned in production.
  if (!isDev()) return null;
  if (previewUrl) return { previewUrl };
  if (mailMode() === 'console') return { verifyUrl };
  return null;
}

// POST /api/signup
router.post('/api/signup', signupLimiter, async (req, res, next) => {
  try {
    const { data, errors, isBot, valid } = validateSignup(req.body);

    // Pretend it worked so bots don't learn about the honeypot
    if (isBot) return res.json({ ok: true, email: data.email });
    if (!valid) return res.status(400).json({ error: 'Check the highlighted fields.', errors });

    let lead = await Lead.findOne({ email: data.email });
    let dev = null;

    if (!lead) {
      lead = await Lead.create({ ...data, verified: false, emailsSent: 0 });
      dev = await sendLinkEmail(lead);
    } else {
      if (!lead.verified) {
        // Same person signing up again: keep their latest answers
        Object.assign(lead, { name: data.name, company: data.company, fleetSize: data.fleetSize, plan: data.plan });
        await lead.save();
      }
      if (!inCooldown(lead)) dev = await sendLinkEmail(lead);
    }

    // Same response whether the email was new or already registered,
    // so nobody can use this form to find out who has an account.
    res.json({ ok: true, email: data.email, ...(dev && { dev }) });
  } catch (err) {
    next(err);
  }
});

// POST /api/resend  { email }
router.post('/api/resend', resendLimiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Enter your email.' });

    const lead = await Lead.findOne({ email });
    if (!lead) return res.json({ ok: true }); // don't reveal whether it exists
    if (inCooldown(lead)) {
      const retryAfter = secondsLeft(lead);
      return res.status(429).json({ error: `Wait ${retryAfter} seconds before asking for another email.`, retryAfter });
    }
    const dev = await sendLinkEmail(lead);
    res.json({ ok: true, ...(dev && { dev }) });
  } catch (err) {
    next(err);
  }
});

// GET /verify?token=...  (the link inside the email)
router.get('/verify', async (req, res, next) => {
  try {
    const token = String(req.query.token || '');
    if (!/^[a-f0-9]{64}$/.test(token)) return res.redirect('/link-expired.html');

    const lead = await Lead.findOne({ verifyTokenHash: sha256(token) });
    if (!lead || !lead.verifyTokenExpires || new Date(lead.verifyTokenExpires) < new Date()) {
      return res.redirect('/link-expired.html');
    }

    const firstTime = !lead.verified;
    if (firstTime) {
      lead.verified = true;
      lead.verifiedAt = new Date();
      lead.apiKey = `mw_live_${crypto.randomBytes(18).toString('base64url')}`;
    }
    // One-time link: clear it so it can't be used again
    lead.verifyTokenHash = null;
    lead.verifyTokenExpires = null;
    await lead.save();

    if (firstTime) {
      const trialEnds = new Date(new Date(lead.verifiedAt).getTime() + TRIAL_DAYS * 864e5);
      // Don't make the user wait for the welcome email; log failures instead
      sendMail({ to: lead.email, ...welcomeEmail({ name: lead.name, dashboardUrl: `${appUrl()}/dashboard.html`, trialEnds }) })
        .catch((e) => console.error('Welcome email failed:', e.message));
    }

    startSession(res, lead);
    res.redirect(firstTime ? '/dashboard.html?welcome=1' : '/dashboard.html');
  } catch (err) {
    next(err);
  }
});

// GET /api/me  -> data for the thank-you dashboard
router.get('/api/me', requireSession, async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.leadId);
    if (!lead || !lead.verified) {
      endSession(res);
      return res.status(401).json({ error: 'Not signed in' });
    }
    const trialEndsAt = new Date(new Date(lead.verifiedAt).getTime() + TRIAL_DAYS * 864e5);
    res.json({
      name: lead.name,
      email: lead.email,
      company: lead.company,
      plan: lead.plan,
      fleetSize: lead.fleetSize,
      verifiedAt: lead.verifiedAt,
      trialEndsAt,
      apiKey: lead.apiKey,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/logout
router.post('/api/logout', (req, res) => {
  endSession(res);
  res.json({ ok: true });
});

module.exports = router;
