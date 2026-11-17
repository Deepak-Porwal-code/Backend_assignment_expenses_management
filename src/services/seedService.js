const Account = require('../models/Account');
const Category = require('../models/Category');
const {
  DEFAULT_ACCOUNTS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} = require('../constants/defaults');

/** Creates the starter accounts and categories for a newly registered user. */
async function seedUserDefaults(userId) {
  const accounts = DEFAULT_ACCOUNTS.map((account) => ({ ...account, user: userId }));

  const categories = [
    ...EXPENSE_CATEGORIES.map((category, index) => ({
      ...category,
      type: 'expense',
      isDefault: true,
      order: index,
      user: userId,
    })),
    ...INCOME_CATEGORIES.map((category, index) => ({
      ...category,
      type: 'income',
      isDefault: true,
      order: index,
      user: userId,
    })),
  ];

  await Promise.all([
    Account.insertMany(accounts),
    Category.insertMany(categories),
  ]);
}

module.exports = { seedUserDefaults };
