const mongoose = require('mongoose');
const Recurring = require('../models/Recurring');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Category = require('../models/Category');
const { endOfUTCDay, nextOccurrence } = require('../utils/date');

const processingUsers = new Set();
const recentlyProcessed = new Map();
const THROTTLE_MS = 60 * 1000;
const MAX_OCCURRENCES_PER_RULE = 24;

/**
 * Creates every transaction that is due for a single user's recurring rules.
 * Safe to call often — it only touches rules whose nextRun is today or earlier.
 */
async function processUserRecurring(userId, { now = new Date() } = {}) {
  const key = userId.toString();
  if (processingUsers.has(key)) return 0;

  processingUsers.add(key);
  let created = 0;

  try {
    const threshold = endOfUTCDay(now);
    const rules = await Recurring.find({
      user: new mongoose.Types.ObjectId(userId),
      isActive: true,
      nextRun: { $lte: threshold },
    }).limit(50);

    for (const rule of rules) {
      const [account, category] = await Promise.all([
        Account.exists({ _id: rule.account, user: rule.user }),
        Category.exists({ _id: rule.category, user: rule.user }),
      ]);

      if (!account || !category) {
        // The rule can no longer produce valid transactions.
        rule.isActive = false;
        await rule.save();
        continue;
      }

      let guard = 0;
      while (rule.nextRun <= threshold && guard < MAX_OCCURRENCES_PER_RULE) {
        await Transaction.create({
          user: rule.user,
          account: rule.account,
          category: rule.category,
          type: rule.type,
          amount: rule.amount,
          note: rule.note,
          date: rule.nextRun,
          recurring: rule._id,
        });

        rule.lastRun = rule.nextRun;
        rule.nextRun = nextOccurrence(rule.nextRun, rule.frequency);
        guard += 1;
        created += 1;
      }

      await rule.save();
    }
  } finally {
    processingUsers.delete(key);
    recentlyProcessed.set(key, Date.now());
  }

  return created;
}

/** Throttled convenience wrapper used on authenticated reads. */
async function ensureRecurringProcessed(userId) {
  const key = userId.toString();
  const last = recentlyProcessed.get(key) || 0;
  if (Date.now() - last < THROTTLE_MS) return 0;
  return processUserRecurring(userId);
}

/** Hourly sweep across all users with due rules (used by the server). */
async function processAllDueRecurring() {
  const dueUsers = await Recurring.distinct('user', {
    isActive: true,
    nextRun: { $lte: endOfUTCDay(new Date()) },
  });

  let created = 0;
  for (const userId of dueUsers) {
    try {
      created += await processUserRecurring(userId);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[moneta] recurring job failed for user', userId.toString(), error.message);
    }
  }
  return created;
}

module.exports = {
  processUserRecurring,
  ensureRecurringProcessed,
  processAllDueRecurring,
};
