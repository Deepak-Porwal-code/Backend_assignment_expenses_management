const { z } = require('zod');
const { objectId, hexColor, optionalBooleanish } = require('./common');
const { sanitizeText } = require('../utils/text');
const { ACCOUNT_TYPES } = require('../constants/defaults');

const accountType = z.enum(ACCOUNT_TYPES.map((item) => item.value));

const accountName = z
  .string()
  .trim()
  .min(2, 'Account name must be at least 2 characters.')
  .max(40, 'Account name cannot exceed 40 characters.')
  .transform(sanitizeText);

const initialBalance = z
  .number({ invalid_type_error: 'Enter a valid starting balance.' })
  .finite()
  .min(-1e12)
  .max(1e12);

const create = z
  .object({
    name: accountName,
    type: accountType,
    initialBalance: z.preprocess(
      (value) => (value === '' || value === undefined ? 0 : Number(value)),
      initialBalance,
    ),
    color: hexColor.optional(),
  })
  .strict();

const update = z
  .object({
    name: accountName.optional(),
    type: accountType.optional(),
    initialBalance: initialBalance.optional(),
    color: hexColor.optional(),
    isArchived: optionalBooleanish,
  })
  .strict();

const params = z.object({ id: objectId }).strict();

const listQuery = z
  .object({
    includeArchived: optionalBooleanish.default(false),
  })
  .strip();

module.exports = { create, update, params, listQuery };
