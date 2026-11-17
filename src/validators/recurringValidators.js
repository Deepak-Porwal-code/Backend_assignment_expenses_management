const { z } = require('zod');
const {
  objectId,
  dateOnly,
  amount,
  note,
  frequency,
  optionalBooleanish,
} = require('./common');
const { TRANSACTION_TYPES } = require('../constants/defaults');

const type = z.enum(TRANSACTION_TYPES);

const bodyAmount = z.preprocess(
  (value) => (typeof value === 'string' ? Number(value) : value),
  amount,
);

const create = z
  .object({
    amount: bodyAmount,
    type,
    category: objectId,
    account: objectId,
    note: note.optional().default(''),
    frequency,
    startDate: dateOnly,
  })
  .strict();

const update = z
  .object({
    amount: bodyAmount.optional(),
    type: type.optional(),
    category: objectId.optional(),
    account: objectId.optional(),
    note: note.optional(),
    frequency: frequency.optional(),
    startDate: dateOnly.optional(),
    isActive: optionalBooleanish,
  })
  .strict();

const params = z.object({ id: objectId }).strict();

module.exports = { create, update, params };
