const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/jwt');
const { setAuthCookie, clearAuthCookie } = require('../utils/cookies');
const { seedUserDefaults } = require('../services/seedService');
const { ensureRecurringProcessed } = require('../services/recurringService');

const BCRYPT_ROUNDS = 12;

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.validated.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ name, email, passwordHash });
  await seedUserDefaults(user._id);

  const token = signToken(user);
  setAuthCookie(res, token);

  res.status(201).json({ user, token });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'Incorrect email or password.');
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw new ApiError(401, 'Incorrect email or password.');
  }

  user.passwordHash = undefined;

  const token = signToken(user);
  setAuthCookie(res, token);

  await ensureRecurringProcessed(user._id);

  res.json({ user, token });
});

const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, currency } = req.validated.body;

  if (name !== undefined) req.user.name = name;
  if (currency !== undefined) req.user.currency = currency;

  await req.user.save();
  res.json({ user: req.user });
});

module.exports = { register, login, logout, me, updateProfile };
