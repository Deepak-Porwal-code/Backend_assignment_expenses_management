const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Recurring = require('../models/Recurring');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getAccountBalances } = require('../services/accountService');
const { roundMoney } = require('../utils/money');

const list = asyncHandler(async (req, res) => {
  const { includeArchived } = req.validated.query;
  const { items, summary } = await getAccountBalances(req.user._id);

  res.json({
    items: includeArchived ? items : items.filter((account) => !account.isArchived),
    summary,
  });
});

const create = asyncHandler(async (req, res) => {
  const account = await Account.create({
    ...req.validated.body,
    user: req.user._id,
  });

  res.status(201).json({
    account: { ...account.toJSON(), balance: roundMoney(account.initialBalance) },
  });
});

const update = asyncHandler(async (req, res) => {
  const account = await Account.findOne({
    _id: req.validated.params.id,
    user: req.user._id,
  });

  if (!account) throw new ApiError(404, 'Account not found.');

  for (const field of ['name', 'type', 'initialBalance', 'color', 'isArchived']) {
    if (req.validated.body[field] !== undefined) {
      account[field] = req.validated.body[field];
    }
  }

  await account.save();

  const { items } = await getAccountBalances(req.user._id);
  const enriched = items.find((item) => item._id.toString() === account._id.toString());

  res.json({ account: enriched || account });
});

const remove = asyncHandler(async (req, res) => {
  const account = await Account.findOne({
    _id: req.validated.params.id,
    user: req.user._id,
  });

  if (!account) throw new ApiError(404, 'Account not found.');

  const [transactions, recurring] = await Promise.all([
    Transaction.exists({ user: req.user._id, account: account._id }),
    Recurring.exists({ user: req.user._id, account: account._id }),
  ]);

  if (transactions || recurring) {
    throw new ApiError(
      409,
      'This account is in use. Archive it instead so your history stays intact.',
    );
  }

  await account.deleteOne();
  res.status(204).send();
});

module.exports = { list, create, update, remove };
