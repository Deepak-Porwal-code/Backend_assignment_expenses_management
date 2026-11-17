const Budget = require('../models/Budget');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getBudgetOverview, assertCategoryBudgetCategory } = require('../services/budgetService');
const { monthKey } = require('../utils/date');
const { roundMoney } = require('../utils/money');

const get = asyncHandler(async (req, res) => {
  const overview = await getBudgetOverview(
    req.user._id,
    req.validated.query.month || monthKey(new Date()),
    req.user.currency,
  );
  res.json(overview);
});

const upsert = asyncHandler(async (req, res) => {
  const { month, amount, scope, category } = req.validated.body;

  if (scope === 'category') {
    await assertCategoryBudgetCategory(req.user._id, category);
  }

  const filter = {
    user: req.user._id,
    month,
    scope,
    category: scope === 'category' ? category : null,
  };

  const budget = await Budget.findOneAndUpdate(
    filter,
    { $set: { amount: roundMoney(amount) } },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  res.json({ budget });
});

const remove = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndDelete({
    _id: req.validated.params.id,
    user: req.user._id,
  });

  if (!budget) throw new ApiError(404, 'Budget not found.');
  res.status(204).send();
});

module.exports = { get, upsert, remove };
