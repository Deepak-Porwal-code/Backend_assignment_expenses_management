const request = require('supertest');
const app = require('../src/app');
const { registerUser, getContext, createTransaction } = require('./helpers');

describe('Budgets and savings goals', () => {
  let user;
  let context;
  const month = '2026-07';

  beforeEach(async () => {
    user = await registerUser(app);
    context = await getContext(app, user.token);
  });

  const auth = (method, url) => request(app)[method](url)
    .set('Authorization', `Bearer ${user.token}`);

  test('creates, updates, and reports an overall monthly budget', async () => {
    const created = await auth('put', '/api/budgets').send({
      month,
      amount: 1000,
      scope: 'overall',
    });
    expect(created.status).toBe(200);
    expect(created.body.budget.amount).toBe(1000);

    await createTransaction(app, user.token, { amount: 300, date: '2026-07-05' });

    const report = await auth('get', `/api/budgets?month=${month}`);
    expect(report.status).toBe(200);
    expect(report.body.overall).toMatchObject({
      amount: 1000,
      spent: 300,
      remaining: 700,
      percent: 30,
      status: 'on_track',
    });

    await auth('put', '/api/budgets').send({ month, amount: 250, scope: 'overall' });

    const exceeded = await auth('get', `/api/budgets?month=${month}`);
    expect(exceeded.body.overall.status).toBe('exceeded');
    expect(exceeded.body.overall.remaining).toBe(-50);
    expect(exceeded.body.overall.message).toMatch(/Budget exceeded by \$50\.00/);

    // Upsert, not duplicate.
    const all = await auth('get', `/api/budgets?month=${month}`);
    expect(all.body.overall).toBeTruthy();
    expect(all.body.categories).toHaveLength(0);
  });

  test('tracks per-category budgets independently and warns at thresholds', async () => {
    await auth('put', '/api/budgets').send({
      month,
      amount: 100,
      scope: 'category',
      category: context.category('Food')._id,
    });

    await createTransaction(app, user.token, { amount: 90, date: '2026-07-03' });

    const atNinety = await auth('get', `/api/budgets?month=${month}`);
    expect(atNinety.body.categories).toHaveLength(1);
    expect(atNinety.body.categories[0]).toMatchObject({
      percent: 90,
      status: 'critical',
      remaining: 10,
    });
    expect(atNinety.body.categories[0].message).toMatch(/used 90% of your July Food budget/i);

    await createTransaction(app, user.token, { amount: 35, date: '2026-07-04' });

    const over = await auth('get', `/api/budgets?month=${month}`);
    expect(over.body.categories[0].status).toBe('exceeded');
    expect(over.body.categories[0].message).toMatch(/Food budget exceeded by \$25\.00/);
  });

  test('rejects invalid budgets and foreign categories', async () => {
    const zero = await auth('put', '/api/budgets').send({ month, amount: 0, scope: 'overall' });
    expect(zero.status).toBe(422);

    const noCategory = await auth('put', '/api/budgets').send({
      month,
      amount: 100,
      scope: 'category',
    });
    expect(noCategory.status).toBe(422);

    const other = await registerUser(app);
    const otherContext = await getContext(app, other.token);
    const foreign = await request(app)
      .put('/api/budgets')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        month,
        amount: 100,
        scope: 'category',
        category: otherContext.category('Food')._id,
      });
    expect(foreign.status).toBe(404);
  });

  test('keeps budgets private between users', async () => {
    const budget = await auth('put', '/api/budgets').send({
      month,
      amount: 500,
      scope: 'overall',
    });

    const other = await registerUser(app);
    const otherReport = await request(app)
      .get(`/api/budgets?month=${month}`)
      .set('Authorization', `Bearer ${other.token}`);
    expect(otherReport.body.overall).toBeNull();

    const deleteForeign = await request(app)
      .delete(`/api/budgets/${budget.body.budget._id}`)
      .set('Authorization', `Bearer ${other.token}`);
    expect(deleteForeign.status).toBe(404);

    const deleteOwn = await auth('delete', `/api/budgets/${budget.body.budget._id}`);
    expect(deleteOwn.status).toBe(204);
  });

  test('tracks savings goal progress and keeps goals isolated', async () => {
    const created = await auth('post', '/api/goals').send({
      name: 'New Laptop',
      targetAmount: 1500,
      currentAmount: 850,
      targetDate: '2026-12-31',
    });

    expect(created.status).toBe(201);
    expect(created.body.goal.percent).toBe(56.7);
    expect(created.body.goal.remaining).toBe(650);
    expect(created.body.goal.status).toBe('on_track');

    const updated = await auth('patch', `/api/goals/${created.body.goal._id}`).send({
      currentAmount: 1600,
    });
    expect(updated.body.goal.status).toBe('achieved');
    expect(updated.body.goal.progressPercent).toBe(100);

    const other = await registerUser(app);
    const otherList = await request(app)
      .get('/api/goals')
      .set('Authorization', `Bearer ${other.token}`);
    expect(otherList.body.items).toHaveLength(0);

    const foreignDelete = await request(app)
      .delete(`/api/goals/${created.body.goal._id}`)
      .set('Authorization', `Bearer ${other.token}`);
    expect(foreignDelete.status).toBe(404);

    const remove = await auth('delete', `/api/goals/${created.body.goal._id}`);
    expect(remove.status).toBe(204);
  });
});
