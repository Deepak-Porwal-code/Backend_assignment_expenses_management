const { roundMoney } = require('../utils/money');
const { DAY_MS, startOfUTCDay } = require('../utils/date');

/** Adds derived progress fields to a goal document or plain object. */
function serializeGoal(goal, now = new Date()) {
  const plain = typeof goal.toObject === 'function' ? goal.toObject() : goal;
  const target = roundMoney(plain.targetAmount);
  const current = roundMoney(plain.currentAmount);
  const percent = target > 0
    ? Math.round((current / target) * 1000) / 10
    : 0;
  const remaining = Math.max(0, roundMoney(target - current));
  const daysLeft = Math.ceil(
    (startOfUTCDay(plain.targetDate) - startOfUTCDay(now)) / DAY_MS,
  );

  let status = 'on_track';
  if (current >= target) status = 'achieved';
  else if (daysLeft < 0) status = 'overdue';

  return {
    ...plain,
    percent,
    progressPercent: Math.min(100, percent),
    remaining,
    daysLeft,
    status,
  };
}

module.exports = { serializeGoal };
