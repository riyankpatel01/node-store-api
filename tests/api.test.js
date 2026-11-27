process.env.JWT_SECRET = 'test-secret-for-automated-tests';
process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { createMemoryModels } = require('./helpers/memoryModels');

const models = createMemoryModels();
let server;
let baseUrl;
let userToken;
let adminToken;
let productId;

async function api(method, path, { body, token, raw } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

before(async () => {
  server = createApp({ models }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

describe('health & errors', () => {
  it('GET /api/health returns ok', async () => {
    const res = await api('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('unknown routes return 404 JSON', async () => {
    const res = await api('GET', '/api/nope');
    assert.equal(res.status, 404);
    assert.match(res.body.error, /not found/);
  });

  it('malformed JSON returns 400', async () => {
    const res = await api('POST', '/api/auth/login', { body: {}, raw: '{"email":' });
    assert.equal(res.status, 400);
  });
});

describe('auth', () => {
  it('registers a user and returns a token without the password hash', async () => {
    const res = await api('POST', '/api/auth/register', {
      body: { name: 'Test User', email: 'User@Example.com', password: 'supersecret1' },
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, 'user@example.com'); // normalised to lowercase
    assert.equal(res.body.user.role, 'user');
    assert.equal(res.body.user.password_hash, undefined);
    userToken = res.body.token;
  });

  it('rejects a duplicate email with 409', async () => {
    const res = await api('POST', '/api/auth/register', {
      body: { name: 'Again', email: 'user@example.com', password: 'supersecret1' },
    });
    assert.equal(res.status, 409);
  });

  it('validates registration input with 422 and field details', async () => {
    const res = await api('POST', '/api/auth/register', { body: { name: 'A', email: 'bad', password: '123' } });
    assert.equal(res.status, 422);
    assert.ok(res.body.details.name);
    assert.ok(res.body.details.email);
    assert.ok(res.body.details.password);
  });

  it('rejects a wrong password with 401', async () => {
    const res = await api('POST', '/api/auth/login', { body: { email: 'user@example.com', password: 'wrong-password' } });
    assert.equal(res.status, 401);
  });

  it('rejects an unknown email with the same 401 message', async () => {
    const res = await api('POST', '/api/auth/login', { body: { email: 'ghost@example.com', password: 'whatever123' } });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Invalid email or password');
  });

  it('logs in and reads the profile with GET /me', async () => {
    const login = await api('POST', '/api/auth/login', { body: { email: 'user@example.com', password: 'supersecret1' } });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.password_hash, undefined);

    const me = await api('GET', '/api/auth/me', { token: login.body.token });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, 'user@example.com');
  });

  it('rejects missing and tampered tokens', async () => {
    assert.equal((await api('GET', '/api/auth/me')).status, 401);
    assert.equal((await api('GET', '/api/auth/me', { token: `${userToken}x` })).status, 401);
  });
});

describe('products', () => {
  before(async () => {
    await api('POST', '/api/auth/register', {
      body: { name: 'Admin', email: 'admin@example.com', password: 'adminpass123' },
    });
    models.users.setRole('admin@example.com', 'admin');
    const login = await api('POST', '/api/auth/login', { body: { email: 'admin@example.com', password: 'adminpass123' } });
    adminToken = login.body.token;
  });

  it('blocks product creation for non-admin users (403)', async () => {
    const res = await api('POST', '/api/products', {
      token: userToken,
      body: { name: 'Laptop', price: 999, category: 'electronics' },
    });
    assert.equal(res.status, 403);
  });

  it('blocks product creation without a token (401)', async () => {
    const res = await api('POST', '/api/products', { body: { name: 'Laptop', price: 999, category: 'electronics' } });
    assert.equal(res.status, 401);
  });

  it('validates product input (422)', async () => {
    const res = await api('POST', '/api/products', { token: adminToken, body: { name: 'X', price: -5 } });
    assert.equal(res.status, 422);
    assert.ok(res.body.details.price);
    assert.ok(res.body.details.category);
  });

  it('lets an admin create products', async () => {
    const seed = [
      { name: 'Gaming Laptop', description: 'RTX graphics', price: 1499.99, stock: 5, category: 'electronics' },
      { name: 'Wireless Mouse', price: 29.5, stock: 120, category: 'electronics' },
      { name: 'Office Chair', price: 249, stock: 12, category: 'furniture' },
    ];
    for (const product of seed) {
      const res = await api('POST', '/api/products', { token: adminToken, body: product });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.name, product.name);
    }

    const res = await api('POST', '/api/products', {
      token: adminToken,
      body: { name: 'Desk Lamp', price: '19.99', category: 'furniture' }, // numeric string is accepted
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.price, 19.99);
    assert.equal(res.body.data.stock, 0); // default
    productId = res.body.data.id;
  });

  it('lists products publicly with pagination', async () => {
    const res = await api('GET', '/api/products?limit=2&page=1');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2);
    assert.deepEqual(res.body.pagination, { page: 1, limit: 2, total: 4, totalPages: 2 });
  });

  it('searches, filters and sorts', async () => {
    const search = await api('GET', '/api/products?search=laptop');
    assert.equal(search.body.pagination.total, 1);

    const filtered = await api('GET', '/api/products?category=furniture&sort=price&order=asc');
    assert.deepEqual(filtered.body.data.map((p) => p.name), ['Desk Lamp', 'Office Chair']);

    const priced = await api('GET', '/api/products?minPrice=100&maxPrice=500');
    assert.deepEqual(priced.body.data.map((p) => p.name), ['Office Chair']);
  });

  it('rejects invalid query parameters (422)', async () => {
    assert.equal((await api('GET', '/api/products?limit=500')).status, 422);
    assert.equal((await api('GET', '/api/products?sort=password')).status, 422);
  });

  it('gets a single product, and 400/404 for bad ids', async () => {
    assert.equal((await api('GET', `/api/products/${productId}`)).status, 200);
    assert.equal((await api('GET', '/api/products/abc')).status, 400);
    assert.equal((await api('GET', '/api/products/99999')).status, 404);
  });

  it('partially updates a product with PATCH', async () => {
    const res = await api('PATCH', `/api/products/${productId}`, { token: adminToken, body: { stock: 40 } });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.stock, 40);
    assert.equal(res.body.data.name, 'Desk Lamp'); // unchanged

    const empty = await api('PATCH', `/api/products/${productId}`, { token: adminToken, body: {} });
    assert.equal(empty.status, 422);
  });

  it('deletes a product (204) and then returns 404', async () => {
    const del = await api('DELETE', `/api/products/${productId}`, { token: adminToken });
    assert.equal(del.status, 204);
    assert.equal((await api('GET', `/api/products/${productId}`)).status, 404);
    assert.equal((await api('DELETE', `/api/products/${productId}`, { token: adminToken })).status, 404);
  });
});
