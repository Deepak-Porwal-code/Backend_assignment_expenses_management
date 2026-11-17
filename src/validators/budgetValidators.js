const { z } = require('zod');
const { objectId, month, amount } = require('./common');

const getQuery = z
  .object({
    month: month.optional(),
  })
  .strip();

const upsert = z
  .object({
    month,
    amount,
    scope: z.enum(['overall', 'category']).default('overall'),
    category: objectId.optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.scope === 'category' && !data.category) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category'],
        message: 'Choose a category for this budget.',
      });
    }
    if (data.scope === 'overall' && data.category) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category'],
        message: 'An overall budget cannot have a category.',
      });
    }
  });

const params = z.object({ id: objectId }).strict();

module.exports = { getQuery, upsert, params };
