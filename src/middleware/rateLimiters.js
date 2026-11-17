const rateLimit = require('express-rate-limit');
const env = require('../config/env');

function limit({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.isTest,
    handler: (_req, res) => {
      res.status(429).json({ message });
    },
  });
}

const authLimiter = limit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many attempts. Please wait 15 minutes and try again.',
});

const apiLimiter = limit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests. Please slow down and try again shortly.',
});

module.exports = { authLimiter, apiLimiter };
