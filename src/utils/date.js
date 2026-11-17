const DAY_MS = 24 * 60 * 60 * 1000;

/** Parses a YYYY-MM-DD string as a calendar date at UTC midnight. */
function parseDateOnly(value) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function startOfUTCDay(date = new Date()) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function endOfUTCDay(date = new Date()) {
  const start = startOfUTCDay(date);
  return new Date(start.getTime() + DAY_MS - 1);
}

function startOfUTCMonth(date = new Date()) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function endOfUTCMonth(date = new Date()) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function addDays(date, days) {
  return new Date(new Date(date).getTime() + days * DAY_MS);
}

/** Adds months to a date while keeping the same day (start-of-month based use). */
function addMonths(date, months) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()));
}

/** Month arithmetic that clamps to the last day (Jan 31 + 1 month = Feb 28/29). */
function addMonthsSafe(date, months) {
  const d = new Date(date);
  const targetYear = d.getUTCFullYear();
  const targetMonth = d.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    targetYear,
    targetMonth,
    Math.min(d.getUTCDate(), lastDay),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds(),
  ));
}

function addYearsSafe(date, years) {
  const d = new Date(date);
  const targetYear = d.getUTCFullYear() + years;
  const lastDay = new Date(Date.UTC(targetYear, d.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    targetYear,
    d.getUTCMonth(),
    Math.min(d.getUTCDate(), lastDay),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds(),
  ));
}

function nextOccurrence(date, frequency) {
  switch (frequency) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addDays(date, 7);
    case 'monthly':
      return addMonthsSafe(date, 1);
    case 'yearly':
      return addYearsSafe(date, 1);
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
}

function monthKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [year, month] = String(key).split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function shortMonthLabel(key) {
  const [year, month] = String(key).split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function monthRange(key) {
  const [year, month] = String(key).split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

function daysBetween(start, end) {
  return Math.round((startOfUTCDay(end) - startOfUTCDay(start)) / DAY_MS);
}

module.exports = {
  DAY_MS,
  parseDateOnly,
  formatDateOnly,
  startOfUTCDay,
  endOfUTCDay,
  startOfUTCMonth,
  endOfUTCMonth,
  addDays,
  addMonths,
  addMonthsSafe,
  addYearsSafe,
  nextOccurrence,
  monthKey,
  monthLabel,
  shortMonthLabel,
  monthRange,
  daysBetween,
};
