const mongoose = require('mongoose');
const { ACCOUNT_TYPES } = require('../constants/defaults');

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Account name is required.'],
      trim: true,
      maxlength: 40,
    },
    type: {
      type: String,
      enum: ACCOUNT_TYPES.map((accountType) => accountType.value),
      required: true,
    },
    initialBalance: {
      type: Number,
      default: 0,
      min: -1e12,
      max: 1e12,
    },
    color: {
      type: String,
      default: '#0A84FF',
      match: /^#[0-9A-Fa-f]{6}$/,
    },
    isArchived: {
      type: Boolean,
      default: false,
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

accountSchema.index({ user: 1, isArchived: 1, createdAt: 1 });

module.exports = mongoose.model('Account', accountSchema);
