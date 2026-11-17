const mongoose = require('mongoose');
const Recurring = require('../models/Recurring');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parseDateOnly } = require('../utils/date');
const { roundMoney } = require('../utils/money');
const { resolveAccount, resolveRelations } = require('../services/relationService');
const {
  ensureRecurringProcessed,
  processUserRecurring,
} = require('../services/recurringService');

const POPULATE = [
  { path: 'category', select: 'name icon color type' },
  { path: 'account', select: 'name type color isArchived' },
];

async function fetchPopulated(id, userId) {
  return Recurring.findOne({ _id: id, user: userId }).populate(POPULATE);
}

const list = asyncHandler(async (req, res) => {
  await ensureRecurringProcessed(req.user._id);

  const items = await Recurring.find({ user: req.user._id })
    .sort({ isActive: -1, nextRun: 1, createdAt: -1 })
    .populate(POPULATE);

  res.json({ items });
});

const create = asyncHandler(async (req, res) => {
  const data = req.validated.body;

  await resolveRelations(req.user._id, {
    accountId: data.account,
    categoryId: data.category,
    type: data.type,
  });

  const rule = await Recurring.create({
    user: req.user._id,
    account: data.account,
    category: data.category,
    type: data.type,
    amount: roundMoney(data.amount),
    note: data.note,
    frequency: data.frequency,
    startDate: parseDateOnly(data.startDate),
    nextRun: parseDateOnly(data.startDate),
    isActive: true,
  });

  // Generate immediately if the first schedule date is today or earlier.
  await processUserRecurring(req.user._id);
  const populated = await fetchPopulated(rule._id, req.user._id);

  res.status(201).json({ rule: populated });
});

const update = asyncHandler(async (req, res) => {
  const rule = await Recurring.findOne({
    _id: req.validated.params.id,
    user: req.user._id,
  });

  if (!rule) throw new ApiError(404, 'Recurring transaction not found.');

  const data = req.validated.body;
  const effectiveType = data.type || rule.type;
  const categoryId = data.category || rule.category;
  const accountId = data.account || rule.account;

  if (data.category || data.type) {
    await resolveRelations(req.user._id, {
      accountId,
      categoryId,
      type: effectiveType,
    });
  } else if (data.account) {
    await resolveAccount(req.user._id, data.account);
  }

  if (data.amount !== undefined) rule.amount = roundMoney(data.amount);
  if (data.type !== undefined) rule.type = data.type;
  if (data.category !== undefined) rule.category = data.category;
  if (data.account !== undefined) rule.account = data.account;
  if (data.note !== undefined) rule.note = data.note;
  if (data.frequency !== undefined) rule.frequency = data.frequency;
  if (data.startDate !== undefined) {
    rule.startDate = parseDateOnly(data.startDate);
    rule.nextRun = parseDateOnly(data.startDate);
  }
  if (data.isActive !== undefined) rule.isActive = data.isActive;

  await rule.save();

  if (rule.isActive) {
    await processUserRecurring(req.user._id);
  }

  const populated = await fetchPopulated(rule._id, req.user._id);
  res.json({ rule: populated });
});

const remove = asyncHandler(async (req, res) => {
  const rule = await Recurring.findOneAndDelete({
    _id: req.validated.params.id,
    user: req.user._id,
  });

  if (!rule) throw new ApiError(404, 'Recurring transaction not found.');
  res.status(204).send();
});

module.exports = { list, create, update, remove };
