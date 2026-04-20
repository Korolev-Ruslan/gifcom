const buckets = new Map();

const pruneBucket = (key, now, windowMs) => {
  const timestamps = buckets.get(key) || [];
  const fresh = timestamps.filter((ts) => now - ts < windowMs);
  buckets.set(key, fresh);
  return fresh;
};

export const createRateLimit = ({ windowMs, max, keyFn, message }) => {
  return (req, res, next) => {
    const now = Date.now();
    const key = keyFn(req);
    const timestamps = pruneBucket(key, now, windowMs);

    if (timestamps.length >= max) {
      return res.status(429).json({ error: message || 'Too many requests' });
    }

    timestamps.push(now);
    buckets.set(key, timestamps);
    next();
  };
};