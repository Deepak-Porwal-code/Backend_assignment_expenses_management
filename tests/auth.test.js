const request = require('supertest');
const app = require('../src/app');
const { registerUser } = require('./helpers');

describe('Authentication', () => {
  test('registers a user, seeds defaults, and issues an HttpOnly cookie', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Deepak Porwal',
        email: 'deepak@example.com',
        password: 'Password123',
      });

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      name: 'Deepak Porwal',
      email: 'deepak@example.com',
      currency: 'USD',
    });
    expect(response.body.user.passwordHash).toBeUndefined();

    const cookies = response.headers['set-cookie'] || [];
    expect(cookies.join(';')).toContain('HttpOnly');

    const accounts = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${response.body.token}`);
    expect(accounts.status).toBe(200);
    expect(accounts.body.items.length).toBeGreaterThanOrEqual(2);

    const categories = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${response.body.token}`);
    expect(categories.body.items.length).toBeGreaterThanOrEqual(16);
  });

  test('rejects a duplicate email', async () => {
    const user = await registerUser(app);
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Another User',
        email: user.credentials.email,
        password: 'Password123',
      });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/already exists/i);
  });

  test('rejects weak passwords and invalid emails', async () => {
    const weak = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Weak User', email: 'weak@example.com', password: 'short' });
    expect(weak.status).toBe(422);
    expect(weak.body.errors.some((error) => error.field === 'password')).toBe(true);

    const badEmail = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bad Email', email: 'not-an-email', password: 'Password123' });
    expect(badEmail.status).toBe(422);
  });

  test('logs in with valid credentials and rejects invalid ones', async () => {
    const user = await registerUser(app);

    const success = await request(app)
      .post('/api/auth/login')
      .send({ email: user.credentials.email, password: user.credentials.password });

    expect(success.status).toBe(200);
    expect(success.body.token).toEqual(expect.any(String));

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: user.credentials.email, password: 'WrongPassword123' });
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.message).toMatch(/incorrect email or password/i);

    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password123' });
    expect(unknown.status).toBe(401);
  });

  test('protects /auth/me and accepts a valid token', async () => {
    const user = await registerUser(app);

    const unauthorized = await request(app).get('/api/auth/me');
    expect(unauthorized.status).toBe(401);

    const authorized = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${user.token}`);
    expect(authorized.status).toBe(200);
    expect(authorized.body.user.email).toBe(user.credentials.email);
  });

  test('rejects a malformed token and logs out cleanly', async () => {
    const invalid = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(invalid.status).toBe(401);

    const logout = await request(app).post('/api/auth/logout');
    expect(logout.status).toBe(204);
  });

  test('updates the profile currency', async () => {
    const user = await registerUser(app);

    const response = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'INR', name: 'Updated Name' });

    expect(response.status).toBe(200);
    expect(response.body.user.currency).toBe('INR');
    expect(response.body.user.name).toBe('Updated Name');
  });
});
