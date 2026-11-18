const mongoose = require('mongoose');
const Category = require('../models/Category');
const { escapeRegex } = require('../utils/text');
const { parseDateOnly, endOfUTCDay } = require('../utils/date');

const SORTS = {
  date_desc: { date: -1, createdAt: -1 },
  date_asc: { date: 1, createdAt: 1 },
  amount_desc: { amount: -1, date: -1 },
  amount_asc: { amount: 1, date: -1 },
};

/**
 * Builds a Mongo query from validated filters. Every query is scoped to the
 * authenticated user, which is what guarantees data isolation.
 */
async function buildTransactionFilter(userId, filters) {
  const query = { user: new mongoose.Types.ObjectId(userId) };

  if (filters.type) query.type = filters.type;
  if (filters.category) query.category = new mongoose.Types.ObjectId(filters.category);
  if (filters.account) query.account = new mongoose.Types.ObjectId(filters.account);

  if (filters.from || filters.to) {
    query.date = {};
    if (filters.from) query.date.$gte = parseDateOnly(filters.from);
    if (filters.to) query.date.$lte = endOfUTCDay(parseDateOnly(filters.to));
  }

  if (filters.min !== undefined || filters.max !== undefined) {
    query.amount = {};
    if (filters.min !== undefined) query.amount.$gte = filters.min;
    if (filters.max !== undefined) query.amount.$lte = filters.max;
  }

  if (filters.search) {
    const term = filters.search.trim();
    if (term) {
      const regex = new RegExp(escapeRegex(term), 'i');
      const categoryMatches = await Category.find({ user: userId, name: regex })
        .select('_id')
        .lean();

      const searchClauses = [{ note: regex }];

      if (categoryMatches.length) {
        searchClauses.push({ category: { $in: categoryMatches.map((item) => item._id) } });
      }

      const numeric = Number(term);
      if (Number.isFinite(numeric) && term.replace(/[.,]/g, '').match(/^\d+$/)) {
        searchClauses.push({ amount: numeric });
      }

      query.$or = searchClauses;
    }
  }

  return { query, sort: SORTS[filters.sort] || SORTS.date_desc };
}

module.exports = { buildTransactionFilter };
