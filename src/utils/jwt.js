const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString() },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn, issuer: env.jwt.issuer },
  );
}

function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret, { issuer: env.jwt.issuer });
}

module.exports = { signToken, verifyToken };
