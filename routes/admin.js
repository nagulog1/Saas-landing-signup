const express = require('express');
const crypto = require('crypto');
const Lead = require('../models/Lead');

const router = express.Router();

// Simple password check via the "x-admin-key" header.
// timingSafeEqual prevents guessing the password from response times.
function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_PASSWORD || '';
  const given = String(req.get('x-admin-key') || '');
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  if (!expected || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Wrong admin password' });
  next();
}

router.use(requireAdmin);

const FIELDS = ['name', 'email', 'company', 'fleetSize', 'plan', 'source', 'verified', 'createdAt', 'verifiedAt'];

async function allLeads() {
  const leads = await Lead.find({}).sort({ createdAt: -1 }).lean();
  return leads.map((l) => Object.fromEntries(FIELDS.map((f) => [f, l[f] ?? null])));
}

// GET /api/admin/leads -> leads + funnel stats
router.get('/leads', async (req, res, next) => {
  try {
    const leads = await allLeads();
    const verified = leads.filter((l) => l.verified).length;
    const count = (key) => leads.reduce((acc, l) => ((acc[l[key]] = (acc[l[key]] || 0) + 1), acc), {});
    res.json({
      stats: {
        total: leads.length,
        verified,
        verificationRate: leads.length ? Math.round((verified / leads.length) * 100) : 0,
        byPlan: count('plan'),
        bySource: count('source'),
      },
      leads,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/leads.csv -> download for Excel / Google Sheets
router.get('/leads.csv', async (req, res, next) => {
  try {
    const leads = await allLeads();
    const cell = (v) => {
      let s = v instanceof Date ? v.toISOString() : String(v ?? '');
      if (/^[=+\-@]/.test(s)) s = `'${s}`; // stop spreadsheet formula injection
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [FIELDS.join(','), ...leads.map((l) => FIELDS.map((f) => cell(l[f])).join(','))].join('\n');
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="meshwatch-leads.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
