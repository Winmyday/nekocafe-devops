const http = require('http');

const BASE_URL = 'http://localhost:8080';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Start the server before tests
let server;

beforeAll((done) => {
  server = require('../src/index.js');
  // Give the server a moment to start
  setTimeout(done, 200);
});

afterAll((done) => {
  if (server) server.close();
  done();
});

describe('Member Service', () => {
  let userId;
  let accessToken;

  test('healthz returns ok', async () => {
    const r = await request('GET', '/healthz');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ok');
    expect(r.body.service).toBe('member');
  });

  test('register creates a new user', async () => {
    const r = await request('POST', '/api/v1/auth/register', {
      phone: '13800138001',
      code: '1234',
      nickname: '测试猫奴',
    });
    expect(r.status).toBe(201);
    expect(r.body.user_id).toBeDefined();
    expect(r.body.access_token).toBeDefined();
    expect(r.body.refresh_token).toBeDefined();
    userId = r.body.user_id;
    accessToken = r.body.access_token;
  });

  test('register missing fields returns 400', async () => {
    const r = await request('POST', '/api/v1/auth/register', { phone: '13800138002' });
    expect(r.status).toBe(400);
  });

  test('login returns token for existing user', async () => {
    const r = await request('POST', '/api/v1/auth/login', {
      phone: '13800138001',
      code: '1234',
    });
    expect(r.status).toBe(200);
    expect(r.body.access_token).toBeDefined();
  });

  test('login non-existent user returns 401', async () => {
    const r = await request('POST', '/api/v1/auth/login', {
      phone: '13900000000',
      code: '0000',
    });
    expect(r.status).toBe(401);
  });

  test('get member profile', async () => {
    const r = await request('GET', `/api/v1/members/${userId}`);
    expect(r.status).toBe(200);
    expect(r.body.user_id).toBe(userId);
    expect(r.body.level).toBe('普通');
    expect(r.body.points).toBe(0);
  });

  test('get non-existent member returns 404', async () => {
    const r = await request('GET', '/api/v1/members/nonexistent-id');
    expect(r.status).toBe(404);
  });

  test('get member points', async () => {
    const r = await request('GET', `/api/v1/members/${userId}/points`);
    expect(r.status).toBe(200);
    expect(r.body.total_points).toBe(0);
    expect(r.body.available_points).toBe(0);
    expect(r.body.history).toEqual([]);
  });

  test('get member points for non-existent member returns 404', async () => {
    const r = await request('GET', '/api/v1/members/nonexistent-id/points');
    expect(r.status).toBe(404);
  });

  test('get member preferences', async () => {
    const r = await request('GET', `/api/v1/members/${userId}/preferences`);
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty('favorite_categories');
    expect(r.body).toHaveProperty('favorite_cat_breeds');
    expect(r.body).toHaveProperty('dietary_restrictions');
    expect(r.body).toHaveProperty('price_range');
    expect(r.body).toHaveProperty('seat_preference');
  });
});