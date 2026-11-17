const Account = require('../models/Account');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');

async function resolveAccount(userId, accountId) {
  const account = await Account.findOne({ _id: accountId, user: userId });
  if (!account) throw new ApiError(404, 'Account not found.');
  return account;
}

async function resolveCategory(userId, categoryId, type) {
  const category = await Category.findOne({ _id: categoryId, user: userId });
  if (!category) throw new ApiError(404, 'Category not found.');
  if (category.type !== type) {
    throw new ApiError(422, 'Choose a category that matches the transaction type.');
  }
  return category;
}

async function resolveRelations(userId, { accountId, categoryId, type }) {
  const [account, category] = await Promise.all([
    resolveAccount(userId, accountId),
    resolveCategory(userId, categoryId, type),
  ]);
  return { account, category };
}

module.exports = { resolveAccount, resolveCategory, resolveRelations };
