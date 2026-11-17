const { z } = require('zod');
const { sanitizeText } = require('../utils/text');
const { CURRENCIES, RECURRENCE_FREQUENCIES } = require('../constants/defaults');

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'That identifier is not valid.');

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD format.')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
  }, 'That date does not exist.');

const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use a month in YYYY-MM format.');

const amount = z
  .number({ invalid_type_error: 'Enter a valid amount.' })
  .finite()
  .positive('Amount must be greater than zero.')
  .max(1e12, 'That amount is too large.');

const queryAmount = z.coerce
  .number({ invalid_type_error: 'Enter a valid amount.' })
  .finite()
  .min(0)
  .max(1e12);

const note = z
  .string()
  .max(200, 'Notes cannot exceed 200 characters.')
  .transform(sanitizeText)
  .default('');

const categoryName = z
  .string()
  .trim()
  .min(2, 'Category name must be at least 2 characters.')
  .max(30, 'Category name cannot exceed 30 characters.')
  .transform(sanitizeText)
  .refine((value) => value.length >= 2, 'Category name must be at least 2 characters.');

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Choose a valid colour.');

const icon = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]+$/, 'Choose a valid icon.')
  .max(40);

const booleanish = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean());

const optionalBooleanish = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === undefined || value === '') return undefined;
  return value;
}, z.boolean().optional());

const currency = z.enum(CURRENCIES);
const frequency = z.enum(RECURRENCE_FREQUENCIES);

module.exports = {
  objectId,
  dateOnly,
  month,
  amount,
  queryAmount,
  note,
  categoryName,
  hexColor,
  icon,
  booleanish,
  optionalBooleanish,
  currency,
  frequency,
};
