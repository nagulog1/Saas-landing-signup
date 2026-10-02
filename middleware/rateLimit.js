// Small in-memory rate limiter (fine for one server; use Redis for several).
// Limits how many requests one IP can make to a route in a time window.
function rateLimit({ windowMs, max, message }) {
  const hits = new Map(); // ip -> [timestamps]

  // Clean up old entries every minute so memory doesn't grow forever
  setInterval(() => {
    const now = Date.now();
    for (const [ip, stamps] of hits) {
      const fresh = stamps.filter((t) => now - t < windowMs);
      fresh.length ? hits.set(ip, fresh) : hits.delete(ip);
    }
  }, 60_000).unref();

  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip;
    const stamps = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    if (stamps.length >= max) {
      const retryAfter = Math.ceil((windowMs - (now - stamps[0])) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message, retryAfter });
    }
    stamps.push(now);
    hits.set(ip, stamps);
    next();
  };
}

module.exports = rateLimit;
