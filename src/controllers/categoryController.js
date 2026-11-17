const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Recurring = require('../models/Recurring');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex } = require('../utils/text');

const list = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.validated.query.type) filter.type = req.validated.query.type;

  const items = await Category.find(filter)
    .sort({ type: 1, order: 1, name: 1 })
    .lean();

  res.json({ items });
});

const create = asyncHandler(async (req, res) => {
  const { name, type, icon, color } = req.validated.body;

  const existing = await Category.findOne({
    user: req.user._id,
    type,
    name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
  });

  if (existing) {
    throw new ApiError(409, `You already have a${type === 'expense' ? 'n expense' : 'n income'} category called “${name}”.`);
  }

  const category = await Category.create({
    user: req.user._id,
    name,
    type,
    icon: icon || 'tag',
    color: color || '#64748B',
    isDefault: false,
    order: 100,
  });

  res.status(201).json({ category });
});

const update = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id: req.validated.params.id,
    user: req.user._id,
  });

  if (!category) throw new ApiError(404, 'Category not found.');
  if (category.isDefault) {
    throw new ApiError(409, 'Default categories can’t be changed. Add a custom category instead.');
  }

  const { name, icon, color } = req.validated.body;

  if (name && name.toLowerCase() !== category.name.toLowerCase()) {
    const existing = await Category.findOne({
      user: req.user._id,
      type: category.type,
      name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
      _id: { $ne: category._id },
    });
    if (existing) throw new ApiError(409, 'You already have a category with that name.');
    category.name = name;
  }

  if (icon !== undefined) category.icon = icon;
  if (color !== undefined) category.color = color;
  await category.save();

  res.json({ category });
});

const remove = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id: req.validated.params.id,
    user: req.user._id,
  });

  if (!category) throw new ApiError(404, 'Category not found.');
  if (category.isDefault) {
    throw new ApiError(409, 'Default categories can’t be deleted.');
  }

  const [transactions, budgets, recurring] = await Promise.all([
    Transaction.exists({ user: req.user._id, category: category._id }),
    Budget.exists({ user: req.user._id, category: category._id }),
    Recurring.exists({ user: req.user._id, category: category._id }),
  ]);

  if (transactions || budgets || recurring) {
    throw new ApiError(
      409,
      'This category is in use. Reassign its transactions and budgets before deleting it.',
    );
  }

  await category.deleteOne();
  res.status(204).send();
});

module.exports = { list, create, update, remove };
