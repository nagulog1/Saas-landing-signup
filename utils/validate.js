// Server-side validation for the sign-up form.
// The browser validates too, but the server must never trust the browser.

const FLEET_SIZES = ['1-25', '26-250', '251-2000', '2000+'];
const PLANS = ['starter', 'team', 'enterprise'];

// Throwaway inboxes give us leads we can never reach again
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'yopmail.com', 'guerrillamail.com', '10minutemail.com',
  'tempmail.com', 'temp-mail.org', 'trashmail.com', 'getnada.com', 'sharklasers.com',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const NAME_RE = /^[\p{L}][\p{L} .'-]{1,59}$/u;

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function validateSignup(body = {}) {
  const errors = {};
  const data = {
    name: str(body.name).replace(/\s+/g, ' '),
    email: str(body.email).toLowerCase(),
    company: str(body.company),
    fleetSize: str(body.fleetSize),
    plan: str(body.plan) || 'starter',
    source: str(body.source).slice(0, 60).replace(/[^\w.-]/g, '') || 'direct',
  };

  if (!data.name) errors.name = 'Enter your name.';
  else if (!NAME_RE.test(data.name)) errors.name = 'Use 2–60 letters. Spaces, dots, hyphens and apostrophes are fine.';

  if (!data.email) errors.email = 'Enter your work email.';
  else if (data.email.length > 254 || !EMAIL_RE.test(data.email)) errors.email = 'Enter an email like name@company.com.';
  else if (DISPOSABLE_DOMAINS.has(data.email.split('@')[1])) errors.email = 'Use a permanent email address, not a temporary inbox.';

  if (data.company.length > 80) errors.company = 'Keep the company name under 80 characters.';

  if (!FLEET_SIZES.includes(data.fleetSize)) errors.fleetSize = 'Choose how many devices you run.';
  if (!PLANS.includes(data.plan)) errors.plan = 'Choose a plan.';

  if (body.consent !== true && body.consent !== 'on' && body.consent !== 'true') {
    errors.consent = 'Accept the terms to create your account.';
  }

  // Honeypot: a hidden field real people never fill in. Bots fill every field.
  const isBot = str(body.website) !== '';

  return { data, errors, isBot, valid: Object.keys(errors).length === 0 };
}

module.exports = { validateSignup, FLEET_SIZES, PLANS };
