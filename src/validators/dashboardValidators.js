const { z } = require('zod');

const query = z
  .object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  })
  .strip();

module.exports = { query };
