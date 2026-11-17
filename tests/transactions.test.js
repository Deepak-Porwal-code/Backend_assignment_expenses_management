const request = require('supertest');
const app = require('../src/app');
const {
  registerUser,
  getContext,
  createTransaction,
  today,
  monthKeyOf,
} = require('./helpers');

describe('Transactions', () => {
  let user;
  let context;

  beforeEach(async () => {
    user = await registerUser(app);
    context = await getContext(app, user.token);
  });

  const authGet = (url) => request(app).get(url).set('Authorization', `Bearer ${user.token}`);
  const authPost = (url) => request(app).post(url).set('Authorization', `Bearer ${user.token}`);
  const authPatch = (url) => request(app).patch(url).set('Authorization', `Bearer ${user.token}`);
  const authDelete = (url) => request(app).delete(url).set('Authorization', `Bearer ${user.token}`);

  test('requires authentication for every transaction route', async () => {
    expect((await request(app).get('/api/transactions')).status).toBe(401);
    expect((await request(app).post('/api/transactions').send({})).status).toBe(401);
    expect((await request(app).get('/api/transactions/export.csv')).status).toBe(401);
  });

  test('creates a transaction with populated category and account', async () => {
    const response = await authPost('/api/transactions').send({
      amount: 42.5,
      type: 'expense',
      category: context.category('Food')._id,
      account: context.account('cash')._id,
      note: 'Dinner with family',
      date: today(),
    });

    expect(response.status).toBe(201);
    expect(response.body.transaction).toMatchObject({
      amount: 42.5,
      type: 'expense',
      note: 'Dinner with family',
    });
    expect(response.body.transaction.category.name).toBe('Food');
    expect(response.body.transaction.account.name).toBe('Cash');
  });

  test('validates required fields, amounts, and rejects unknown fields', async () => {
    const missing = await authPost('/api/transactions').send({});
    expect(missing.status).toBe(422);

    const zero = await authPost('/api/transactions').send({
      amount: 0,
      type: 'expense',
      category: context.category('Food')._id,
      account: context.account('cash')._id,
    });
    expect(zero.status).toBe(422);

    const unknown = await authPost('/api/transactions').send({
      amount: 10,
      type: 'expense',
      category: context.category('Food')._id,
      account: context.account('cash')._id,
      isAdmin: true,
    });
    expect(unknown.status).toBe(422);

    const injection = await authPost('/api/transactions').send({
      amount: 10,
      type: { $ne: null },
      category: context.category('Food')._id,
      account: context.account('cash')._id,
    });
    expect(injection.status).toBe(422);
  });

  test('rejects a category that does not match the transaction type', async () => {
    const response = await authPost('/api/transactions').send({
      amount: 100,
      type: 'income',
      category: context.category('Food', 'expense')._id,
      account: context.account('cash')._id,
    });

    expect(response.status).toBe(422);
    expect(response.body.message).toMatch(/matches the transaction type/i);
  });

  test('paginates results on the server', async () => {
    for (let index = 0; index < 12; index += 1) {
      const result = await createTransaction(app, user.token, {
        amount: 10 + index,
        note: `Page item ${index}`,
        date: today(),
      });
      expect(result.status).toBe(201);
    }

    const pageOne = await authGet('/api/transactions?page=1&limit=5');
    expect(pageOne.status).toBe(200);
    expect(pageOne.body.items).toHaveLength(5);
    expect(pageOne.body.pagination).toMatchObject({
      page: 1,
      limit: 5,
      total: 12,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    });

    const pageThree = await authGet('/api/transactions?page=3&limit=5');
    expect(pageThree.body.items).toHaveLength(2);
    expect(pageThree.body.pagination.hasNext).toBe(false);
    expect(pageThree.body.pagination.hasPrev).toBe(true);

    const tooLarge = await authGet('/api/transactions?limit=500');
    expect(tooLarge.status).toBe(422);
  });

  test('combines filters, search, and summaries', async () => {
    const cash = context.account('cash');
    const bank = context.account('bank');

    await createTransaction(app, user.token, {
      amount: 25,
      type: 'expense',
      category: context.category('Food')._id,
      account: cash._id,
      note: 'Team lunch',
      date: '2026-07-01',
    });
    await createTransaction(app, user.token, {
      amount: 2500,
      type: 'income',
      category: context.category('Salary', 'income')._id,
      account: bank._id,
      note: 'Monthly salary',
      date: '2026-07-02',
    });
    await createTransaction(app, user.token, {
      amount: 120,
      type: 'expense',
      category: context.category('Travel')._id,
      account: cash._id,
      note: 'Train tickets',
      date: '2026-07-10',
    });

    const byType = await authGet('/api/transactions?type=income');
    expect(byType.body.items).toHaveLength(1);
    expect(byType.body.items[0].note).toBe('Monthly salary');

    const byCategory = await authGet(`/api/transactions?category=${context.category('Food')._id}`);
    expect(byCategory.body.items).toHaveLength(1);

    const byAccount = await authGet(`/api/transactions?account=${cash._id}`);
    expect(byAccount.body.items).toHaveLength(2);

    const byDate = await authGet('/api/transactions?from=2026-07-02&to=2026-07-31');
    expect(byDate.body.items).toHaveLength(2);

    const byAmount = await authGet('/api/transactions?min=100&max=3000');
    expect(byAmount.body.items).toHaveLength(2);

    const bySearch = await authGet('/api/transactions?search=lunch');
    expect(bySearch.body.items).toHaveLength(1);
    expect(bySearch.body.items[0].note).toBe('Team lunch');

    const byNumericSearch = await authGet('/api/transactions?search=2500');
    expect(byNumericSearch.body.items).toHaveLength(1);
    expect(byNumericSearch.body.items[0].type).toBe('income');

    const combined = await authGet(
      `/api/transactions?type=expense&category=${context.category('Travel')._id}&account=${cash._id}&from=2026-07-01&to=2026-07-31&min=50&max=200&search=train`,
    );
    expect(combined.body.items).toHaveLength(1);
    expect(combined.body.summary).toEqual({ income: 0, expense: 120, net: -120 });
  });

  test('updates and deletes an owned transaction', async () => {
    const created = await createTransaction(app, user.token, {
      amount: 30,
      note: 'Original note',
    });

    const updated = await authPatch(`/api/transactions/${created.body.transaction._id}`).send({
      amount: 55.75,
      note: 'Updated note',
      type: 'income',
      category: context.category('Salary', 'income')._id,
      account: context.account('bank')._id,
    });

    expect(updated.status).toBe(200);
    expect(updated.body.transaction.amount).toBe(55.75);
    expect(updated.body.transaction.note).toBe('Updated note');
    expect(updated.body.transaction.category.name).toBe('Salary');

    const removed = await authDelete(`/api/transactions/${created.body.transaction._id}`);
    expect(removed.status).toBe(204);

    const missing = await authGet(`/api/transactions/${created.body.transaction._id}`);
    expect(missing.status).toBe(404);
  });

  test('rejects changing the type without a matching category', async () => {
    const created = await createTransaction(app, user.token);

    const response = await authPatch(`/api/transactions/${created.body.transaction._id}`)
      .send({ type: 'income' });

    expect(response.status).toBe(422);
    expect(response.body.message).toMatch(/category for the new transaction type/i);
  });

  test('strictly isolates one user’s data from another', async () => {
    const other = await registerUser(app);
    const otherContext = await getContext(app, other.token);

    const transaction = await createTransaction(app, user.token, {
      amount: 99,
      note: 'Private transaction',
    });
    const transactionId = transaction.body.transaction._id;

    const otherList = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${other.token}`);
    expect(otherList.status).toBe(200);
    expect(otherList.body.items).toHaveLength(0);
    expect(otherList.body.pagination.total).toBe(0);

    const read = await request(app)
      .get(`/api/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${other.token}`);
    expect(read.status).toBe(404);

    const update = await request(app)
      .patch(`/api/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${other.token}`)
      .send({ note: 'Hacked' });
    expect(update.status).toBe(404);

    const remove = await request(app)
      .delete(`/api/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${other.token}`);
    expect(remove.status).toBe(404);

    const cannotUseForeignAccount = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${other.token}`)
      .send({
        amount: 10,
        type: 'expense',
        category: otherContext.category('Food')._id,
        account: context.account('cash')._id,
      });
    expect(cannotUseForeignAccount.status).toBe(404);
  });

  test('exports filtered transactions as CSV', async () => {
    await createTransaction(app, user.token, {
      amount: 25,
      note: 'Lunch, with team',
      date: '2026-07-01',
    });
    await createTransaction(app, user.token, {
      amount: 2500,
      type: 'income',
      category: context.category('Salary', 'income')._id,
      note: 'Monthly Salary',
      date: '2026-07-02',
    });

    const response = await authGet('/api/transactions/export.csv?type=expense');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/csv/);
    expect(response.headers['content-disposition']).toMatch(/attachment; filename="moneta-transactions/);

    const lines = response.text.replace(/^\uFEFF/, '').trim().split('\r\n');
    expect(lines[0]).toBe('Date,Type,Category,Account,Amount,Note');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('Expense,Food,Cash,25.00,"Lunch, with team"');
  });

  test('stores and serves an optional attachment only to its owner', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${user.token}`)
      .field('amount', '18')
      .field('type', 'expense')
      .field('category', context.category('Food')._id)
      .field('account', context.account('cash')._id)
      .field('note', 'Receipt test')
      .field('date', today())
      .attach('attachment', Buffer.from('fake-png-content'), {
        filename: 'receipt.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(201);
    expect(response.body.transaction.attachment).toMatchObject({
      filename: 'receipt.png',
      contentType: 'image/png',
    });
    expect(response.body.transaction.attachment.data).toBeUndefined();

    const ownerFile = await authGet(`/api/transactions/${response.body.transaction._id}/attachment`);
    expect(ownerFile.status).toBe(200);
    expect(ownerFile.headers['content-type']).toMatch(/image\/png/);

    const other = await registerUser(app);
    const denied = await request(app)
      .get(`/api/transactions/${response.body.transaction._id}/attachment`)
      .set('Authorization', `Bearer ${other.token}`);
    expect(denied.status).toBe(404);
  });

  test('dashboard totals and analytics are derived from stored transactions', async () => {
    const month = monthKeyOf();
    await createTransaction(app, user.token, {
      amount: 1000,
      type: 'income',
      category: context.category('Salary', 'income')._id,
      date: today(),
    });
    await createTransaction(app, user.token, {
      amount: 200,
      type: 'expense',
      category: context.category('Food')._id,
      date: today(),
    });
    await createTransaction(app, user.token, {
      amount: 100,
      type: 'expense',
      category: context.category('Travel')._id,
      date: today(),
    });

    const dashboard = await authGet(`/api/dashboard?month=${month}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.monthTotals).toMatchObject({ income: 1000, expense: 300, net: 700 });
    expect(dashboard.body.recentTransactions).toHaveLength(3);
    expect(dashboard.body.topCategories[0].name).toBe('Food');
    expect(dashboard.body.overview).toHaveLength(6);

    const analytics = await authGet('/api/analytics?range=month');
    expect(analytics.status).toBe(200);
    expect(analytics.body.summary).toMatchObject({ income: 1000, expense: 300, net: 700 });
    expect(analytics.body.breakdown).toHaveLength(2);
    expect(analytics.body.breakdown[0].name).toBe('Food');
    expect(analytics.body.trend.length).toBeGreaterThan(0);
  });
});
