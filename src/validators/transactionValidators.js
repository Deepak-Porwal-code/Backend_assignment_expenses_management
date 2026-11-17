const { z } = require('zod');
const {
  objectId,
  dateOnly,
  amount,
  queryAmount,
  note,
  booleanish,
  optionalBooleanish,
  frequency,
} = require('./common');
const { TRANSACTION_TYPES } = require('../constants/defaults');

const type = z.enum(TRANSACTION_TYPES);

// multipart/form-data sends every field as a string, so coerce numbers here.
const bodyAmount = z.preprocess(
  (value) => (typeof value === 'string' ? Number(value) : value),
  amount,
);

const bodyDate = z.preprocess(
  (value) => (value === '' || value === undefined ? undefined : value),
  dateOnly.optional(),
);

const create = z
  .object({
    amount: bodyAmount,
    type,
    category: objectId,
    account: objectId,
    note: note.optional().default(''),
    date: bodyDate,
    isRecurring: booleanish.optional().default(false),
    frequency: frequency.optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.isRecurring && !data.frequency) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['frequency'],
        message: 'Choose how often this transaction repeats.',
      });
    }
  });

const update = z
  .object({
    amount: bodyAmount.optional(),
    type: type.optional(),
    category: objectId.optional(),
    account: objectId.optional(),
    note: note.optional(),
    date: bodyDate,
    removeAttachment: optionalBooleanish,
  })
  .strict();

const params = z.object({ id: objectId }).strict();

const sortOptions = ['date_desc', 'date_asc', 'amount_desc', 'amount_asc'];

const listQuery = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    type: type.optional(),
    category: objectId.optional(),
    account: objectId.optional(),
    from: dateOnly.optional(),
    to: dateOnly.optional(),
    min: queryAmount.optional(),
    max: queryAmount.optional(),
    search: z.string().trim().max(80).optional(),
    sort: z.enum(sortOptions).default('date_desc'),
  })
  .strip()
  .superRefine((data, context) => {
    if (data.min !== undefined && data.max !== undefined && data.min > data.max) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['max'],
        message: 'Maximum amount must be greater than the minimum.',
      });
    }
    if (data.from && data.to && data.from > data.to) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: 'End date must be on or after the start date.',
      });
    }
  });

module.exports = { create, update, params, listQuery };
