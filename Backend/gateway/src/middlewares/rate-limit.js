const rateLimit = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';
const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: !isProduction,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

module.exports = { defaultLimiter, authLimiter };
