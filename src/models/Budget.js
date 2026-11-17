const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Budget must be greater than zero.'],
      max: 1e12,
    },
    scope: {
      type: String,
      enum: ['overall', 'category'],
      default: 'overall',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
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

budgetSchema.index(
  { user: 1, month: 1, scope: 1, category: 1 },
  { unique: true },
);
budgetSchema.index({ user: 1, month: 1 });

module.exports = mongoose.model('Budget', budgetSchema);
