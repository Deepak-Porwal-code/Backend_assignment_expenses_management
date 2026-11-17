const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const {
  startOfUTCDay,
  endOfUTCDay,
  startOfUTCMonth,
  endOfUTCMonth,
  addDays,
  addMonths,
  daysBetween,
  formatDateOnly,
  shortMonthLabel,
} = require('../utils/date');
const { roundMoney } = require('../utils/money');

const shortDate = (date) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
}).format(date);

const longDate = (date) => new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
}).format(date);

const longMonth = (date) => new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}).format(date);

function buildBuckets(range, now) {
  const todayStart = startOfUTCDay(now);
  const todayEnd = endOfUTCDay(now);
  const buckets = [];

  if (range === 'week') {
    const start = addDays(todayStart, -6);
    for (let index = 0; index < 7; index += 1) {
      const day = addDays(start, index);
      buckets.push({
        key: formatDateOnly(day),
        label: shortDate(day),
        fullLabel: longDate(day),
        start: startOfUTCDay(day),
        end: endOfUTCDay(day),
      });
    }
    return { buckets, start, end: todayEnd };
  }

  if (range === 'month') {
    const start = startOfUTCMonth(now);
    for (let day = start; day <= todayStart; day = addDays(day, 1)) {
      buckets.push({
        key: formatDateOnly(day),
        label: shortDate(day),
        fullLabel: longDate(day),
        start: startOfUTCDay(day),
        end: endOfUTCDay(day),
      });
    }
    return { buckets, start, end: todayEnd };
  }

  if (range === '3months') {
    const start = startOfUTCMonth(addMonths(startOfUTCMonth(now), -2));
    let cursor = start;
    while (cursor <= todayStart) {
      const bucketEndDay = new Date(Math.min(addDays(cursor, 6).getTime(), todayStart.getTime()));
      buckets.push({
        key: formatDateOnly(cursor),
        label: shortDate(cursor),
        fullLabel: `${shortDate(cursor)} – ${shortDate(bucketEndDay)}`,
        start: startOfUTCDay(cursor),
        end: endOfUTCDay(bucketEndDay),
      });
      cursor = addDays(cursor, 7);
    }
    return { buckets, start, end: todayEnd };
  }

  // year
  const start = startOfUTCMonth(addMonths(startOfUTCMonth(now), -11));
  for (let index = 0; index < 12; index += 1) {
    const monthStart = startOfUTCMonth(addMonths(start, index));
    const monthEnd = endOfUTCMonth(monthStart);
    const end = new Date(Math.min(monthEnd.getTime(), todayEnd.getTime()));
    buckets.push({
      key: formatDateOnly(monthStart),
      label: shortMonthLabel(`${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}`),
      fullLabel: longMonth(monthStart),
      start: monthStart,
      end,
    });
  }
  return { buckets, start, end: todayEnd };
}

async function totalsForPeriod(userId, start, end) {
  const rows = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const totals = { income: 0, expense: 0, count: 0 };
  for (const row of rows) {
    totals[row._id] = roundMoney(row.total);
    totals.count += row.count;
  }
  totals.net = roundMoney(totals.income - totals.expense);
  return totals;
}

function changeFromPrevious(current, previous) {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function formatPeriodLabel(start, end) {
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  if (formatDateOnly(start) === formatDateOnly(end)) {
    return `${shortDate(start)}, ${start.getUTCFullYear()}`;
  }
  if (sameYear) {
    return `${shortDate(start)} – ${shortDate(end)}, ${start.getUTCFullYear()}`;
  }
  return `${shortDate(start)}, ${start.getUTCFullYear()} – ${shortDate(end)}, ${end.getUTCFullYear()}`;
}

async function getAnalytics(userId, range = 'month', now = new Date()) {
  const { buckets, start, end } = buildBuckets(range, now);
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const durationMs = end.getTime() - start.getTime() + 1;
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs + 1);

  const [current, previous, dailyRows, categoryRows] = await Promise.all([
    totalsForPeriod(userId, start, end),
    totalsForPeriod(userId, previousStart, previousEnd),
    Transaction.aggregate([
      {
        $match: { user: userObjectId, date: { $gte: start, $lte: end } },
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' } },
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
          date: { $gte: start, $lte: end },
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
    ]),
  ]);

  const dailyMap = new Map();
  for (const row of dailyRows) {
    const dayKey = row._id.day;
    const entry = dailyMap.get(dayKey) || { income: 0, expense: 0 };
    entry[row._id.type] = roundMoney(row.total);
    dailyMap.set(dayKey, entry);
  }

  const trend = buckets.map((bucket) => {
    let income = 0;
    let expense = 0;

    for (let day = bucket.start; day <= bucket.end; day = addDays(day, 1)) {
      const entry = dailyMap.get(formatDateOnly(day));
      if (entry) {
        income += entry.income;
        expense += entry.expense;
      }
    }

    return {
      key: bucket.key,
      label: bucket.label,
      fullLabel: bucket.fullLabel,
      income: roundMoney(income),
      expense: roundMoney(expense),
      net: roundMoney(income - expense),
    };
  });

  const categories = await Category.find({
    _id: { $in: categoryRows.map((row) => row._id) },
  }).lean();
  const categoryMap = new Map(categories.map((category) => [category._id.toString(), category]));

  const categoryTotal = categoryRows.reduce((sum, row) => sum + row.total, 0);

  const breakdown = categoryRows.map((row) => {
    const category = categoryMap.get(row._id.toString());
    const total = roundMoney(row.total);
    return {
      categoryId: row._id ? row._id.toString() : null,
      name: category?.name || 'Uncategorized',
      icon: category?.icon || 'shapes',
      color: category?.color || '#94A3B8',
      total,
      count: row.count,
      percent: categoryTotal > 0 ? Math.round((total / categoryTotal) * 1000) / 10 : 0,
    };
  });

  const savingsRate = current.income > 0
    ? Math.round((current.net / current.income) * 1000) / 10
    : 0;

  return {
    range,
    period: {
      start: formatDateOnly(start),
      end: formatDateOnly(end),
      label: formatPeriodLabel(start, end),
    },
    summary: {
      income: current.income,
      expense: current.expense,
      net: current.net,
      savingsRate,
      transactions: current.count,
      averageDailySpend: roundMoney(current.expense / (daysBetween(start, end) + 1)),
    },
    comparison: {
      previous: {
        income: previous.income,
        expense: previous.expense,
        net: previous.net,
      },
      incomeChange: changeFromPrevious(current.income, previous.income),
      expenseChange: changeFromPrevious(current.expense, previous.expense),
      netChange: changeFromPrevious(current.net, previous.net),
    },
    trend,
    breakdown,
  };
}

module.exports = { getAnalytics };
