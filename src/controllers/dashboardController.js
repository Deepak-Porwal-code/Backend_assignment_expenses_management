const mongoose = require('mongoose');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const asyncHandler = require('../utils/asyncHandler');
const {
  monthKey,
  monthRange,
  monthLabel,
  startOfUTCMonth,
  endOfUTCMonth,
  addMonths,
  shortMonthLabel,
} = require('../utils/date');
const { roundMoney } = require('../utils/money');
const { getBudgetOverview } = require('../services/budgetService');
const { serializeGoal } = require('../services/goalService');
const { ensureRecurringProcessed } = require('../services/recurringService');

const POPULATE = [
  { path: 'category', select: 'name icon color type' },
  { path: 'account', select: 'name type color isArchived' },
];

function totalFromRows(rows) {
  const total = { income: 0, expense: 0 };
  for (const row of rows) total[row._id] = roundMoney(row.total);
  return total;
}

const overview = asyncHandler(async (req, res) => {
  await ensureRecurringProcessed(req.user._id);

  const key = req.validated.query.month || monthKey(new Date());
  const { start: monthStart, end: monthEnd } = monthRange(key);
  const selectedMonthStart = startOfUTCMonth(monthStart);
  const overviewStart = startOfUTCMonth(addMonths(selectedMonthStart, -5));
  const overviewEnd = endOfUTCMonth(selectedMonthStart);
  const userObjectId = new mongoose.Types.ObjectId(req.user._id);

  const [
    lifetimeRows,
    monthRows,
    accountRows,
    recentTransactions,
    overviewRows,
    topCategoryRows,
    goals,
    budgetOverview,
  ] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: userObjectId } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { user: userObjectId, date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]),
    Account.aggregate([
      { $match: { user: userObjectId, isArchived: false } },
      {
        $group: {
          _id: null,
          initialBalance: { $sum: '$initialBalance' },
          count: { $sum: 1 },
        },
      },
    ]),
    Transaction.find({ user: userObjectId })
      .sort({ date: -1, createdAt: -1 })
      .limit(8)
      .select('-attachment.data')
      .populate(POPULATE),
    Transaction.aggregate([
      {
        $match: {
          user: userObjectId,
          date: { $gte: overviewStart, $lte: overviewEnd },
        },
      },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
    ]),
    Transaction.aggregate([
      {
        $match: {
          user: userObjectId,
          type: 'expense',
          date: { $gte: monthStart, $lte: monthEnd },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 6 },
    ]),
    Goal.find({ user: userObjectId }).sort({ targetDate: 1 }).limit(3),
    getBudgetOverview(req.user._id, key, req.user.currency),
  ]);

  const lifetime = totalFromRows(lifetimeRows);
  const monthTotals = totalFromRows(monthRows);
  const accountsSummary = accountRows[0] || { initialBalance: 0, count: 0 };

  const overviewMap = new Map();
  for (const row of overviewRows) {
    const monthKeyValue = row._id.month;
    const entry = overviewMap.get(monthKeyValue) || { income: 0, expense: 0 };
    entry[row._id.type] = roundMoney(row.total);
    overviewMap.set(monthKeyValue, entry);
  }

  const monthlyOverview = Array.from({ length: 6 }, (_item, index) => {
    const date = addMonths(selectedMonthStart, index - 5);
    const rowKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    const entry = overviewMap.get(rowKey) || { income: 0, expense: 0 };
    return {
      key: rowKey,
      label: shortMonthLabel(rowKey),
      income: roundMoney(entry.income),
      expense: roundMoney(entry.expense),
      net: roundMoney(entry.income - entry.expense),
    };
  });

  const categoryDocs = await Category.find({
    _id: { $in: topCategoryRows.map((row) => row._id) },
  }).lean();
  const categoryMap = new Map(categoryDocs.map((category) => [category._id.toString(), category]));

  const topCategories = topCategoryRows.map((row) => {
    const category = categoryMap.get(row._id?.toString());
    return {
      categoryId: row._id ? row._id.toString() : null,
      name: category?.name || 'Uncategorized',
      icon: category?.icon || 'shapes',
      color: category?.color || '#94A3B8',
      total: roundMoney(row.total),
      count: row.count,
      percent: monthTotals.expense > 0
        ? Math.round((row.total / monthTotals.expense) * 1000) / 10
        : 0,
    };
  });

  res.json({
    month: key,
    monthLabel: monthLabel(key),
    totals: {
      balance: roundMoney(accountsSummary.initialBalance + lifetime.income - lifetime.expense),
      income: lifetime.income,
      expense: lifetime.expense,
    },
    monthTotals: {
      income: monthTotals.income,
      expense: monthTotals.expense,
      net: roundMoney(monthTotals.income - monthTotals.expense),
    },
    accountsSummary: {
      totalBalance: roundMoney(accountsSummary.initialBalance + lifetime.income - lifetime.expense),
      activeCount: accountsSummary.count,
    },
    budget: budgetOverview.overall,
    budgetAlerts: budgetOverview.categories
      .filter((budget) => ['warning', 'critical', 'exceeded'].includes(budget.status))
      .slice(0, 3),
    recentTransactions,
    overview: monthlyOverview,
    topCategories,
    goals: goals.map((goal) => serializeGoal(goal)),
  });
});

module.exports = { overview };
