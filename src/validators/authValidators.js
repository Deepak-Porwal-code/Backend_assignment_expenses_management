const { z } = require('zod');
const { currency } = require('./common');
const { sanitizeText } = require('../utils/text');

const name = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .max(60, 'Name cannot exceed 60 characters.')
  .transform(sanitizeText);

const email = z
  .string()
  .trim()
  .email('Enter a valid email address.')
  .max(254, 'Email is too long.')
  .transform((value) => value.toLowerCase());

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password cannot exceed 72 characters.')
  .regex(/[A-Za-z]/, 'Password must include a letter.')
  .regex(/[0-9]/, 'Password must include a number.');

const register = z
  .object({
    name,
    email,
    password,
  })
  .strict();

const login = z
  .object({
    email,
    password: z.string().min(1, 'Enter your password.').max(72),
  })
  .strict();

const updateProfile = z
  .object({
    name: name.optional(),
    currency: currency.optional(),
  })
  .strict();

module.exports = { register, login, updateProfile };
