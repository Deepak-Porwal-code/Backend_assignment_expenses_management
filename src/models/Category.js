const mongoose = require('mongoose');
const { TRANSACTION_TYPES } = require('../constants/defaults');

const categorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required.'],
      trim: true,
      maxlength: 30,
    },
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
    },
    icon: {
      type: String,
      default: 'tag',
      trim: true,
      maxlength: 40,
    },
    color: {
      type: String,
      default: '#64748B',
      match: /^#[0-9A-Fa-f]{6}$/,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 100,
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

// Case-insensitive uniqueness per user + transaction type.
categorySchema.index(
  { user: 1, type: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);
categorySchema.index({ user: 1, type: 1, order: 1, name: 1 });

module.exports = mongoose.model('Category', categorySchema);
