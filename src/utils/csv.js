const { formatDateOnly } = require('../utils/date');

function escapeCell(value) {
  let text = value === null || value === undefined ? '' : String(value);

  // Protect spreadsheet apps from formula injection.
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function transactionsToCsv(transactions) {
  const header = ['Date', 'Type', 'Category', 'Account', 'Amount', 'Note'];
  const lines = [header.join(',')];

  for (const transaction of transactions) {
    const type = transaction.type === 'income' ? 'Income' : 'Expense';
    const category = transaction.category?.name || 'Uncategorized';
    const account = transaction.account?.name || 'Account';
    const amount = Number(transaction.amount).toFixed(2);

    lines.push([
      formatDateOnly(transaction.date),
      type,
      category,
      account,
      amount,
      transaction.note || '',
    ].map(escapeCell).join(','));
  }

  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

module.exports = { transactionsToCsv };
