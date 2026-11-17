const env = require('../config/env');

const baseCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? 'none' : 'lax',
  path: '/',
};

function setAuthCookie(res, token) {
  res.cookie(env.cookie.name, token, {
    ...baseCookieOptions,
    maxAge: env.cookie.maxAgeMs,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(env.cookie.name, baseCookieOptions);
}

module.exports = { setAuthCookie, clearAuthCookie };
