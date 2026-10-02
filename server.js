require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const connectDatabase = require('./config/db');
const { getTransporter } = require('./services/mailer');
const signupRoutes = require('./routes/signup');
const adminRoutes = require('./routes/admin');

const PORT = process.env.PORT || 3000;

if (!process.env.SESSION_SECRET) {
  console.warn('⚠  SESSION_SECRET not set — using an insecure development secret. Set it in .env!');
  process.env.SESSION_SECRET = 'dev_only_insecure_secret';
}

async function start() {
  await connectDatabase();
  getTransporter().catch(() => {}); // warm up the mailer so the first sign-up is fast

  const app = express();
  app.set('trust proxy', 1); // correct client IPs behind Render/Railway/Nginx

  // Basic security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  app.use(signupRoutes);
  app.use('/api/admin', adminRoutes);
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((req, res) => res.redirect('/')); // unknown page -> landing page

  // Central error handler
  app.use((err, req, res, next) => {
    console.error(err);
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request' });
    res.status(500).json({ error: 'Something went wrong on our side. Try again in a minute.' });
  });

  app.listen(PORT, () => console.log(`🚀  Meshwatch running at http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
