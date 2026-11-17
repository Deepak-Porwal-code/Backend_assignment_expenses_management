const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { roundMoney } = require('../utils/money');

/**
 * Returns every account with its computed lifetime balance.
 * Balance = starting balance + income - expenses.
 */
async function getAccountBalances(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [accounts, grouped] = await Promise.all([
    Account.find({ user: userObjectId }).sort({ createdAt: 1 }).lean(),
    Transaction.aggregate([
      { $match: { user: userObjectId } },
      {
        $group: {
          _id: { account: '$account', type: '$type' },
          total: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  const totals = new Map();
  for (const row of grouped) {
    const key = row._id.account.toString();
    const current = totals.get(key) || { income: 0, expense: 0 };
    current[row._id.type] = roundMoney(row.total);
    totals.set(key, current);
  }

  let totalBalance = 0;

  const items = accounts.map((account) => {
    const totalsForAccount = totals.get(account._id.toString()) || { income: 0, expense: 0 };
    const balance = roundMoney(
      account.initialBalance + totalsForAccount.income - totalsForAccount.expense,
    );

    if (!account.isArchived) {
      totalBalance = roundMoney(totalBalance + balance);
    }

    return {
      ...account,
      income: totalsForAccount.income,
      expense: totalsForAccount.expense,
      balance,
    };
  });

  return {
    items,
    summary: {
      totalBalance,
      activeCount: items.filter((account) => !account.isArchived).length,
    },
  };
}

module.exports = { getAccountBalances };
