const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
};

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function formatMoney(value, currency = 'USD') {
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${CURRENCY_SYMBOLS[currency] || '$'}${amount.toFixed(2)}`;
  }
}

function currencySymbol(currency = 'USD') {
  return CURRENCY_SYMBOLS[currency] || '$';
}

module.exports = { roundMoney, formatMoney, currencySymbol, CURRENCY_SYMBOLS };
