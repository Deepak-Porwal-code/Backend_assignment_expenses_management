const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const { monthKey, monthLabel, monthRange } = require('../utils/date');
const { roundMoney, formatMoney } = require('../utils/money');
const ApiError = require('../utils/ApiError');

function budgetStatus(percent) {
  if (percent >= 100) return 'exceeded';
  if (percent >= 90) return 'critical';
  if (percent >= 75) return 'warning';
  if (percent >= 50) return 'watch';
  return 'on_track';
}

function buildProgress({ amount, spent, currency, monthName, categoryName = null }) {
  const safeSpent = roundMoney(spent);
  const remaining = roundMoney(amount - safeSpent);
  const percent = amount > 0 ? Math.round((safeSpent / amount) * 1000) / 10 : 0;
  const status = budgetStatus(percent);
  const label = categoryName ? `${categoryName} budget` : 'budget';

  let message;
  if (status === 'exceeded') {
    message = `${categoryName ? `${categoryName} budget` : 'Budget'} exceeded by ${formatMoney(Math.abs(remaining), currency)}.`;
  } else if (status === 'critical') {
    message = `You have used ${Math.round(percent)}% of your ${monthName} ${label}. ${formatMoney(remaining, currency)} left.`;
  } else if (status === 'warning') {
    message = `Heads up — you've used ${Math.round(percent)}% of your ${monthName} ${label}.`;
  } else if (status === 'watch') {
    message = `You're halfway there — ${Math.round(percent)}% of your ${monthName} ${label} used.`;
  } else {
    message = `${Math.round(percent)}% of your ${monthName} ${label} used. You're on track.`;
  }

  return {
    amount: roundMoney(amount),
    spent: safeSpent,
    remaining,
    percent,
    status,
    message,
    threshold: status === 'exceeded' ? 100 : status === 'critical' ? 90 : status === 'warning' ? 75 : status === 'watch' ? 50 : 0,
  };
}

async function getBudgetOverview(userId, requestedMonth, currency = 'USD') {
  const key = requestedMonth || monthKey(new Date());
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) {
    throw new ApiError(422, 'Use a month in YYYY-MM format.');
  }

  const { start, end } = monthRange(key);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const label = monthLabel(key);
  const monthName = label.split(' ')[0];

  const [budgets, grouped] = await Promise.all([
    Budget.find({ user: userObjectId, month: key })
      .populate('category', 'name icon color type')
      .lean(),
    Transaction.aggregate([
      {
        $match: {
          user: userObjectId,
          type: 'expense',
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  const spentByCategory = new Map(
    grouped.map((row) => [row._id.toString(), roundMoney(row.total)]),
  );
  const totalSpent = roundMoney(grouped.reduce((sum, row) => sum + row.total, 0));

  const overallBudget = budgets.find((budget) => budget.scope === 'overall');
  const categoryBudgets = budgets.filter((budget) => budget.scope === 'category');

  const overall = overallBudget
    ? {
      _id: overallBudget._id,
      amount: roundMoney(overallBudget.amount),
      ...buildProgress({
        amount: overallBudget.amount,
        spent: totalSpent,
        currency,
        monthName,
      }),
    }
    : null;

  const categories = categoryBudgets
    .filter((budget) => budget.category)
    .map((budget) => {
      const spent = spentByCategory.get(budget.category._id.toString()) || 0;
      return {
        _id: budget._id,
        category: budget.category,
        amount: roundMoney(budget.amount),
        ...buildProgress({
          amount: budget.amount,
          spent,
          currency,
          monthName,
          categoryName: budget.category.name,
        }),
      };
    })
    .sort((a, b) => b.percent - a.percent);

  return {
    month: key,
    monthLabel: label,
    overall,
    categories,
    totalSpent,
    totalBudgeted: roundMoney(categoryBudgets.reduce((sum, budget) => sum + budget.amount, 0)),
  };
}

async function assertCategoryBudgetCategory(userId, categoryId) {
  const category = await Category.findOne({
    _id: categoryId,
    user: userId,
    type: 'expense',
  });

  if (!category) {
    throw new ApiError(404, 'Expense category not found.');
  }

  return category;
}

module.exports = {
  getBudgetOverview,
  buildProgress,
  assertCategoryBudgetCategory,
};
