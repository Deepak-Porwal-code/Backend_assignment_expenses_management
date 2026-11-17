const mongoose = require('mongoose');
const { TRANSACTION_TYPES, RECURRENCE_FREQUENCIES } = require('../constants/defaults');

const recurringSchema = new mongoose.Schema(
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
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be greater than zero.'],
      max: 1e12,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    frequency: {
      type: String,
      enum: RECURRENCE_FREQUENCIES,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    nextRun: {
      type: Date,
      required: true,
    },
    lastRun: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

recurringSchema.index({ isActive: 1, nextRun: 1 });
recurringSchema.index({ user: 1, isActive: 1, nextRun: 1 });

module.exports = mongoose.model('Recurring', recurringSchema);
