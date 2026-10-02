const mongoose = require('mongoose');

// A lead = someone who signed up from the landing page.
// They stay "unverified" until they click the link in the verification email.
const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    company: { type: String, trim: true, maxlength: 80, default: '' },
    fleetSize: { type: String, enum: ['1-25', '26-250', '251-2000', '2000+'], required: true },
    plan: { type: String, enum: ['starter', 'team', 'enterprise'], default: 'starter' },

    // Marketing attribution (from ?utm_source=... on the landing page URL)
    source: { type: String, trim: true, maxlength: 60, default: 'direct' },

    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },

    // We store only a SHA-256 hash of the token, never the token itself,
    // so a database leak can't be used to verify accounts.
    verifyTokenHash: { type: String, default: null, index: true },
    verifyTokenExpires: { type: Date, default: null },
    lastEmailSentAt: { type: Date, default: null },
    emailsSent: { type: Number, default: 0 },

    apiKey: { type: String, default: null }, // issued after verification
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lead', leadSchema);
