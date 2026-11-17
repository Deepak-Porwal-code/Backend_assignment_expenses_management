const request = require('supertest');

let counter = 0;

function nextEmail() {
  counter += 1;
  return `tester-${Date.now()}-${counter}@example.com`;
}

async function registerUser(app, overrides = {}) {
  const payload = {
    name: 'Test User',
    email: nextEmail(),
    password: 'Password123',
    ...overrides,
  };

  const response = await request(app).post('/api/auth/register').send(payload);
  if (response.status !== 201) {
    throw new Error(`Registration failed: ${JSON.stringify(response.body)}`);
  }

  return {
    ...response.body,
    credentials: payload,
    auth(requestBuilder) {
      return requestBuilder.set('Authorization', `Bearer ${response.body.token}`);
    },
  };
}

const contextCache = new Map();

async function getContext(app, token) {
  if (contextCache.has(token)) return contextCache.get(token);

  const [accountsResponse, categoriesResponse] = await Promise.all([
    request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`),
    request(app).get('/api/categories').set('Authorization', `Bearer ${token}`),
  ]);

  const context = {
    accounts: accountsResponse.body.items,
    categories: categoriesResponse.body.items,
  };
  context.account = (type = 'cash') => context.accounts.find((account) => account.type === type);
  context.category = (name, type = 'expense') => context.categories.find(
    (category) => category.name === name && category.type === type,
  );

  contextCache.set(token, context);
  return context;
}

async function createTransaction(app, token, overrides = {}) {
  const context = await getContext(app, token);
  const type = overrides.type || 'expense';
  const category = overrides.category || context.category(type === 'income' ? 'Salary' : 'Food', type);
  const account = overrides.account || context.account('cash');

  const response = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send({
      amount: 25,
      type,
      category: category._id,
      account: account._id,
      note: 'Test transaction',
      date: new Date().toISOString().slice(0, 10),
      ...overrides,
      category: overrides.category || category._id,
      account: overrides.account || account._id,
    });

  return response;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function monthKeyOf(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

module.exports = {
  registerUser,
  getContext,
  createTransaction,
  today,
  daysAgo,
  monthKeyOf,
};
