const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Recurring = require('../models/Recurring');
const path = require('path');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  parseDateOnly,
  formatDateOnly,
  nextOccurrence,
} = require('../utils/date');
const { roundMoney } = require('../utils/money');
const { buildTransactionFilter } = require('../services/transactionFilterService');
const { ensureRecurringProcessed } = require('../services/recurringService');
const { resolveAccount, resolveRelations } = require('../services/relationService');
const { transactionsToCsv } = require('../utils/csv');

const POPULATE = [
  { path: 'category', select: 'name icon color type' },
  { path: 'account', select: 'name type color isArchived' },
];

function attachmentFromFile(file) {
  return {
    filename: path.basename(file.originalname).slice(0, 180),
    contentType: file.mimetype,
    size: file.size,
    data: file.buffer,
  };
}

async function populateTransaction(transaction) {
  await transaction.populate(POPULATE);
  return transaction;
}

const list = asyncHandler(async (req, res) => {
  await ensureRecurringProcessed(req.user._id);

  const filters = req.validated.query;
  const { query, sort } = await buildTransactionFilter(req.user._id, filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total, summaryRows] = await Promise.all([
    Transaction.find(query)
      .sort(sort)
      .skip(skip)
      .limit(filters.limit)
      .select('-attachment.data')
      .populate(POPULATE),
    Transaction.countDocuments(query),
    Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  const summary = { income: 0, expense: 0, net: 0 };
  for (const row of summaryRows) {
    summary[row._id] = roundMoney(row.total);
  }
  summary.net = roundMoney(summary.income - summary.expense);

  res.json({
    items,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
      hasNext: skip + items.length < total,
      hasPrev: filters.page > 1,
    },
    summary,
  });
});

const exportCsv = asyncHandler(async (req, res) => {
  const filters = req.validated.query;
  const { query, sort } = await buildTransactionFilter(req.user._id, filters);

  const transactions = await Transaction.find(query)
    .sort(sort)
    .limit(10000)
    .select('-attachment.data')
    .populate(POPULATE)
    .lean();

  const csv = transactionsToCsv(transactions);
  const filename = `moneta-transactions-${formatDateOnly(new Date())}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(csv);
});

const getOne = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.validated.params.id,
    user: req.user._id,
  })
    .select('-attachment.data')
    .populate(POPULATE);

  if (!transaction) throw new ApiError(404, 'Transaction not found.');

  res.json({ transaction });
});

const create = asyncHandler(async (req, res) => {
  const data = req.validated.body;
  const date = data.date ? parseDateOnly(data.date) : parseDateOnly(formatDateOnly(new Date()));

  await resolveRelations(req.user._id, {
    accountId: data.account,
    categoryId: data.category,
    type: data.type,
  });

  let recurring = null;

  if (data.isRecurring) {
    recurring = await Recurring.create({
      user: req.user._id,
      account: data.account,
      category: data.category,
      type: data.type,
      amount: roundMoney(data.amount),
      note: data.note,
      frequency: data.frequency,
      startDate: date,
      nextRun: nextOccurrence(date, data.frequency),
      lastRun: date,
    });
  }

  try {
    const transaction = await Transaction.create({
      user: req.user._id,
      account: data.account,
      category: data.category,
      type: data.type,
      amount: roundMoney(data.amount),
      note: data.note,
      date,
      recurring: recurring ? recurring._id : null,
      attachment: req.file ? attachmentFromFile(req.file) : null,
    });

    await populateTransaction(transaction);
    res.status(201).json({ transaction: transaction.toJSON() });
  } catch (error) {
    if (recurring) await recurring.deleteOne().catch(() => {});
    throw error;
  }
});

const update = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.validated.params.id,
    user: req.user._id,
  });

  if (!transaction) throw new ApiError(404, 'Transaction not found.');

  const data = req.validated.body;
  const effectiveType = data.type || transaction.type;

  if (data.type && data.type !== transaction.type && !data.category) {
    const currentCategory = await Category.findById(transaction.category);
    if (!currentCategory || currentCategory.type !== data.type) {
      throw new ApiError(422, 'Choose a category for the new transaction type.');
    }
  }

  if (data.category) {
    const { category } = await resolveRelations(req.user._id, {
      accountId: data.account || transaction.account,
      categoryId: data.category,
      type: effectiveType,
    });
    transaction.category = category._id;
  }

  if (data.account) {
    const account = await resolveAccount(req.user._id, data.account);
    transaction.account = account._id;
  }

  if (data.type) transaction.type = data.type;
  if (data.amount !== undefined) transaction.amount = roundMoney(data.amount);
  if (data.note !== undefined) transaction.note = data.note;
  if (data.date) transaction.date = parseDateOnly(data.date);

  if (req.file) {
    transaction.attachment = attachmentFromFile(req.file);
  } else if (data.removeAttachment) {
    transaction.attachment = null;
  }

  await transaction.save();
  await populateTransaction(transaction);

  res.json({ transaction: transaction.toJSON() });
});

const remove = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOneAndDelete({
    _id: req.validated.params.id,
    user: req.user._id,
  });

  if (!transaction) throw new ApiError(404, 'Transaction not found.');
  res.status(204).send();
});

const attachment = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.validated.params.id,
    user: req.user._id,
  }).select('+attachment.data');

  if (!transaction || !transaction.attachment || !transaction.attachment.data) {
    throw new ApiError(404, 'This transaction has no attachment.');
  }

  const { filename, contentType, data } = transaction.attachment;
  res.setHeader('Content-Type', contentType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${String(filename || 'attachment').replace(/"/g, '')}"`);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.send(data);
});

module.exports = { list, exportCsv, getOne, create, update, remove, attachment };
