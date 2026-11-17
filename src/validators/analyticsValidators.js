const { z } = require('zod');

const query = z
  .object({
    range: z.enum(['week', 'month', '3months', 'year']).default('month'),
  })
  .strip();

module.exports = { query };
