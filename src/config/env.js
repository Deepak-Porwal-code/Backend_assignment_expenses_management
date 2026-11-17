const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const clientOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set to at least 32 characters in production.');
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be set in production.');
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  isTest,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/moneta',
  jwt: {
    secret: process.env.JWT_SECRET || 'moneta-local-development-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'moneta-api',
  },
  cookie: {
    name: process.env.COOKIE_NAME || 'moneta_token',
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  },
  clientOrigins,
};
