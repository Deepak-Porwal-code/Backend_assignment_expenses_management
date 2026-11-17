const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Goal name is required.'],
      trim: true,
      maxlength: 60,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: [1, 'Target amount must be greater than zero.'],
      max: 1e12,
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
      max: 1e12,
    },
    targetDate: {
      type: Date,
      required: true,
    },
    color: {
      type: String,
      default: '#6366F1',
      match: /^#[0-9A-Fa-f]{6}$/,
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

goalSchema.index({ user: 1, targetDate: 1 });

module.exports = mongoose.model('Goal', goalSchema);
