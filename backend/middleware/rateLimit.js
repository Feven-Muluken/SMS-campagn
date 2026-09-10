const buckets = new Map();

const rateLimit = ({ windowMs, max, key = (req) => req.ip }) => (req, res, next) => {
  const now = Date.now();
  const bucketKey = String(key(req) || req.ip || 'unknown');
  const current = buckets.get(bucketKey);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;

  bucket.count += 1;
  buckets.set(bucketKey, bucket);

  res.setHeader('RateLimit-Limit', String(max));
  res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
  res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > max) {
    res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    return res.status(429).json({
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMITED',
    });
  }

  next();
};

module.exports = { rateLimit };
