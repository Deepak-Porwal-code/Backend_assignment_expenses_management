const Goal = require('../models/Goal');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { serializeGoal } = require('../services/goalService');
const { parseDateOnly } = require('../utils/date');
const { roundMoney } = require('../utils/money');

const list = asyncHandler(async (req, res) => {
  const goals = await Goal.find({ user: req.user._id }).sort({ targetDate: 1 });
  const items = goals.map((goal) => serializeGoal(goal));

  items.sort((a, b) => {
    if (a.status === 'achieved' && b.status !== 'achieved') return 1;
    if (b.status === 'achieved' && a.status !== 'achieved') return -1;
    return new Date(a.targetDate) - new Date(b.targetDate);
  });

  res.json({ items });
});

const create = asyncHandler(async (req, res) => {
  const data = req.validated.body;
  const goal = await Goal.create({
    user: req.user._id,
    name: data.name,
    targetAmount: roundMoney(data.targetAmount),
    currentAmount: roundMoney(data.currentAmount || 0),
    targetDate: parseDateOnly(data.targetDate),
    color: data.color || '#6366F1',
  });

  res.status(201).json({ goal: serializeGoal(goal) });
});

const update = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({
    _id: req.validated.params.id,
    user: req.user._id,
  });

  if (!goal) throw new ApiError(404, 'Goal not found.');

  const data = req.validated.body;
  if (data.name !== undefined) goal.name = data.name;
  if (data.targetAmount !== undefined) goal.targetAmount = roundMoney(data.targetAmount);
  if (data.currentAmount !== undefined) goal.currentAmount = roundMoney(data.currentAmount);
  if (data.targetDate !== undefined) goal.targetDate = parseDateOnly(data.targetDate);
  if (data.color !== undefined) goal.color = data.color;

  await goal.save();
  res.json({ goal: serializeGoal(goal) });
});

const remove = asyncHandler(async (req, res) => {
  const goal = await Goal.findOneAndDelete({
    _id: req.validated.params.id,
    user: req.user._id,
  });

  if (!goal) throw new ApiError(404, 'Goal not found.');
  res.status(204).send();
});

module.exports = { list, create, update, remove };
