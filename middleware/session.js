const jwt = require('jsonwebtoken');

// After verification we log the lead into their dashboard with a signed JWT
// stored in an httpOnly cookie (JavaScript in the page can't read it -> safer vs XSS).
const COOKIE = 'mw_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function startSession(res, lead) {
  const token = jwt.sign({ id: lead._id.toString() }, process.env.SESSION_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_MS,
  });
}

function endSession(res) {
  res.clearCookie(COOKIE);
}

function requireSession(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  try {
    req.leadId = jwt.verify(token, process.env.SESSION_SECRET).id;
    next();
  } catch {
    endSession(res);
    res.status(401).json({ error: 'Session expired' });
  }
}

module.exports = { startSession, endSession, requireSession };
