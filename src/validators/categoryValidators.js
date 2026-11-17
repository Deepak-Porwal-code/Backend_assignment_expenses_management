const { z } = require('zod');
const { objectId, categoryName, hexColor, icon } = require('./common');
const { TRANSACTION_TYPES } = require('../constants/defaults');

const type = z.enum(TRANSACTION_TYPES);

const create = z
  .object({
    name: categoryName,
    type,
    icon: icon.optional(),
    color: hexColor.optional(),
  })
  .strict();

const update = z
  .object({
    name: categoryName.optional(),
    icon: icon.optional(),
    color: hexColor.optional(),
  })
  .strict();

const params = z.object({ id: objectId }).strict();

const listQuery = z
  .object({
    type: type.optional(),
  })
  .strip();

module.exports = { create, update, params, listQuery };
