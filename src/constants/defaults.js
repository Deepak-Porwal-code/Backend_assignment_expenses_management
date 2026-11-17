const EXPENSE_CATEGORIES = [
  { name: 'Food', icon: 'utensils', color: '#F97316' },
  { name: 'Travel', icon: 'plane', color: '#0EA5E9' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#EC4899' },
  { name: 'Bills', icon: 'receipt', color: '#F59E0B' },
  { name: 'Rent', icon: 'home', color: '#8B5CF6' },
  { name: 'Entertainment', icon: 'clapperboard', color: '#EF4444' },
  { name: 'Health', icon: 'heart-pulse', color: '#14B8A6' },
  { name: 'Education', icon: 'graduation-cap', color: '#6366F1' },
  { name: 'Subscription', icon: 'repeat', color: '#A855F7' },
  { name: 'Other', icon: 'shapes', color: '#64748B' },
];

const INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'wallet', color: '#22C55E' },
  { name: 'Freelance', icon: 'laptop', color: '#10B981' },
  { name: 'Business', icon: 'briefcase', color: '#0D9488' },
  { name: 'Investment', icon: 'trending-up', color: '#84CC16' },
  { name: 'Gift', icon: 'gift', color: '#F43F5E' },
  { name: 'Other', icon: 'shapes', color: '#64748B' },
];

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash', icon: 'banknote', color: '#10B981' },
  { value: 'bank', label: 'Bank Account', icon: 'landmark', color: '#0A84FF' },
  { value: 'credit', label: 'Credit Card', icon: 'credit-card', color: '#8B5CF6' },
  { value: 'wallet', label: 'Wallet', icon: 'wallet', color: '#F59E0B' },
  { value: 'savings', label: 'Savings', icon: 'piggy-bank', color: '#14B8A6' },
];

const DEFAULT_ACCOUNTS = [
  { name: 'Cash', type: 'cash', color: '#10B981', initialBalance: 0 },
  { name: 'Bank Account', type: 'bank', color: '#0A84FF', initialBalance: 0 },
];

const TRANSACTION_TYPES = ['income', 'expense'];
const RECURRENCE_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'];

module.exports = {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  ACCOUNT_TYPES,
  DEFAULT_ACCOUNTS,
  TRANSACTION_TYPES,
  RECURRENCE_FREQUENCIES,
  CURRENCIES,
};
