const request = require('supertest');
const app = require('../src/app');
const {
  registerUser,
  getContext,
  createTransaction,
  today,
  daysAgo,
} = require('./helpers');

describe('Recurring transactions', () => {
  let user;
  let context;

  beforeEach(async () => {
    user = await registerUser(app);
    context = await getContext(app, user.token);
  });

  const auth = (method, url) => request(app)[method](url)
    .set('Authorization', `Bearer ${user.token}`);

  test('creates a rule and generates every missed occurrence automatically', async () => {
    const response = await auth('post', '/api/recurring').send({
      amount: 1200,
      type: 'expense',
      category: context.category('Rent')._id,
      account: context.account('bank')._id,
      note: 'Monthly rent',
      frequency: 'daily',
      startDate: daysAgo(3),
    });

    expect(response.status).toBe(201);
    expect(response.body.rule).toMatchObject({
      amount: 1200,
      frequency: 'daily',
      isActive: true,
    });

    const transactions = await auth('get', '/api/transactions?limit=20');
    expect(transactions.status).toBe(200);
    expect(transactions.body.items).toHaveLength(4);
    expect(transactions.body.items.every((item) => item.recurring)).toBe(true);
    expect(transactions.body.items.map((item) => item.date.slice(0, 10)).sort())
      .toEqual([daysAgo(3), daysAgo(2), daysAgo(1), today()].sort());
  });

  test('creates a recurring rule from the transaction form', async () => {
    const response = await auth('post', '/api/transactions').send({
      amount: 15.99,
      type: 'expense',
      category: context.category('Subscription')._id,
      account: context.account('bank')._id,
      note: 'Streaming service',
      date: today(),
      isRecurring: true,
      frequency: 'monthly',
    });

    expect(response.status).toBe(201);
    expect(response.body.transaction.recurring).toBeTruthy();

    const rules = await auth('get', '/api/recurring');
    expect(rules.status).toBe(200);
    expect(rules.body.items).toHaveLength(1);
    expect(rules.body.items[0].note).toBe('Streaming service');
    expect(new Date(rules.body.items[0].nextRun).getTime()).toBeGreaterThan(Date.now());
  });

  test('pauses and resumes a recurring rule', async () => {
    const created = await auth('post', '/api/recurring').send({
      amount: 50,
      type: 'expense',
      category: context.category('Health')._id,
      account: context.account('cash')._id,
      note: 'Gym',
      frequency: 'weekly',
      startDate: today(),
    });

    expect(created.status).toBe(201);

    const paused = await auth('patch', `/api/recurring/${created.body.rule._id}`)
      .send({ isActive: false });
    expect(paused.status).toBe(200);
    expect(paused.body.rule.isActive).toBe(false);

    const resumed = await auth('patch', `/api/recurring/${created.body.rule._id}`)
      .send({ isActive: true });
    expect(resumed.body.rule.isActive).toBe(true);
  });

  test('validates recurring input and isolates rules between users', async () => {
    const invalid = await auth('post', '/api/recurring').send({
      amount: 20,
      type: 'expense',
      category: context.category('Food')._id,
      account: context.account('cash')._id,
      frequency: 'fortnightly',
      startDate: today(),
    });
    expect(invalid.status).toBe(422);

    const created = await auth('post', '/api/recurring').send({
      amount: 20,
      type: 'expense',
      category: context.category('Food')._id,
      account: context.account('cash')._id,
      note: 'Coffee',
      frequency: 'weekly',
      startDate: today(),
    });

    const other = await registerUser(app);
    const otherList = await request(app)
      .get('/api/recurring')
      .set('Authorization', `Bearer ${other.token}`);
    expect(otherList.body.items).toHaveLength(0);

    const foreignDelete = await request(app)
      .delete(`/api/recurring/${created.body.rule._id}`)
      .set('Authorization', `Bearer ${other.token}`);
    expect(foreignDelete.status).toBe(404);

    const ownDelete = await auth('delete', `/api/recurring/${created.body.rule._id}`);
    expect(ownDelete.status).toBe(204);

    const transactions = await auth('get', '/api/transactions');
    expect(transactions.body.pagination.total).toBe(1);
  });

  test('requires authentication', async () => {
    expect((await request(app).get('/api/recurring')).status).toBe(401);
    expect((await request(app).post('/api/recurring').send({})).status).toBe(401);
  });
});
