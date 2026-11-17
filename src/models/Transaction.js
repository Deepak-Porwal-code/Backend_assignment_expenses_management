const mongoose = require('mongoose');
const { TRANSACTION_TYPES } = require('../constants/defaults');

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, trim: true, maxlength: 180 },
    contentType: { type: String, trim: true, maxlength: 80 },
    size: { type: Number, min: 0 },
    data: { type: Buffer, select: false },
  },
  { _id: false },
);

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Account is required.'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required.'],
    },
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required.'],
      min: [0.01, 'Amount must be greater than zero.'],
      max: 1e12,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    attachment: {
      type: attachmentSchema,
      default: null,
    },
    recurring: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recurring',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        if (ret.attachment) {
          delete ret.attachment.data;
        }
        return ret;
      },
    },
  },
);

transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1, date: -1 });
transactionSchema.index({ user: 1, account: 1, date: -1 });
transactionSchema.index({ user: 1, recurring: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
