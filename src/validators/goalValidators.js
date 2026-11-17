const { z } = require('zod');
const { objectId, dateOnly, amount, hexColor } = require('./common');
const { sanitizeText } = require('../utils/text');

const goalName = z
  .string()
  .trim()
  .min(2, 'Goal name must be at least 2 characters.')
  .max(60, 'Goal name cannot exceed 60 characters.')
  .transform(sanitizeText);

const create = z
  .object({
    name: goalName,
    targetAmount: amount,
    currentAmount: z.number().finite().min(0).max(1e12).optional().default(0),
    targetDate: dateOnly,
    color: hexColor.optional(),
  })
  .strict();

const update = z
  .object({
    name: goalName.optional(),
    targetAmount: amount.optional(),
    currentAmount: z.number().finite().min(0).max(1e12).optional(),
    targetDate: dateOnly.optional(),
    color: hexColor.optional(),
  })
  .strict();

const params = z.object({ id: objectId }).strict();

module.exports = { create, update, params };
