const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function extractToken(req) {
  if (req.cookies && req.cookies[env.cookie.name]) {
    return req.cookies[env.cookie.name];
  }
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}

/** Verifies the JWT and attaches the authenticated user to `req.user`. */
const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);

  if (!token) {
    throw new ApiError(401, 'Please sign in to continue.');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, 'This account no longer exists.');
  }

  req.user = user;
  next();
});

module.exports = { requireAuth, extractToken };
