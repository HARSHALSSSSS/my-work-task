const rateLimit = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';
const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const trustedProxyHops = parsePositiveInt(process.env.TRUST_PROXY_HOPS, 1);

const normalizeIp = (value) =>
  String(value || '')
    .trim()
    .replace(/^\[|\]$/g, '')
    .replace(/:\d+[^:]*$/, '');

const getClientIpKey = (req) => {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map((value) => normalizeIp(value))
    .filter(Boolean);

  if (forwardedFor.length) {
    const index = Math.max(0, forwardedFor.length - trustedProxyHops);
    return forwardedFor[index];
  }

  return (
    normalizeIp(req.ip) ||
    normalizeIp(req.socket?.remoteAddress) ||
    'unknown-client'
  );
};

const defaultWindowMs = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const defaultMax = parsePositiveInt(
  process.env.RATE_LIMIT_MAX,
  isProduction ? 200 : 2000
);
const authWindowMs = parsePositiveInt(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS,
  isProduction ? 15 * 60 * 1000 : 60 * 1000
);
const authMax = parsePositiveInt(
  process.env.AUTH_RATE_LIMIT_MAX,
  isProduction ? 20 : 500
);

const defaultLimiter = rateLimit({
  windowMs: defaultWindowMs,
  max: defaultMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIpKey(req),
  validate: {
    xForwardedForHeader: false,
    default: true,
  },
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: !isProduction,
  keyGenerator: (req) => getClientIpKey(req),
  validate: {
    xForwardedForHeader: false,
    default: true,
  },
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

module.exports = { defaultLimiter, authLimiter };
