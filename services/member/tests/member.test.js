const request = require('supertest');
const express = require('express');

// We don't require the main index.js (which starts a real server),
// instead we import the app logic by requiring the app for testing.
// For simplicity, we test via the running server.
const BASE_URL = 'http://localhost:8080';

let server;

beforeAll((done) => {
  server = require('../src/index.js');
  setTimeout(done, 300);
});

afterAll((done) => {
  if (server && typeof server.close === 'function') {
    server.close(() => done());
  } else {
    done();
  }
});

describe('Member Service', () => {
  let userId;

  test('healthz returns ok', async () => {
    const res = await request(BASE_URL).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('member');
  });

  test('register creates a new user', async () => {
    const res = await request(BASE_URL)
      .post('/api/v1/auth/register')
      .send({ phone: '13800138001', code: '1234', nickname: '测试猫奴' });
    expect(res.status).toBe(201);
    expect(res.body.user_id).toBeDefined();
    expect(res.body.access_token).toBeDefined();
    userId = res.body.user_id;
  });

  test('register missing code returns 400', async () => {
    const res = await request(BASE_URL)
      .post('/api/v1/auth/register')
      .send({ phone: '13800138002' });
    expect(res.status).toBe(400);
  });

  test('login returns token', async () => {
    const res = await request(BASE_URL)
      .post('/api/v1/auth/login')
      .send({ phone: '13800138001', code: '1234' });
    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
  });

  test('login non-existent user returns 401', async () => {
    const res = await request(BASE_URL)
      .post('/api/v1/auth/login')
      .send({ phone: '13900000000', code: '0000' });
    expect(res.status).toBe(401);
  });

  test('get member profile', async () => {
    const res = await request(BASE_URL).get(`/api/v1/members/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.level).toBe('普通');
    expect(res.body.points).toBe(0);
  });

  test('get non-existent member returns 404', async () => {
    const res = await request(BASE_URL).get('/api/v1/members/nonexistent-id');
    expect(res.status).toBe(404);
  });

  test('get member points', async () => {
    const res = await request(BASE_URL).get(`/api/v1/members/${userId}/points`);
    expect(res.status).toBe(200);
    expect(res.body.total_points).toBe(0);
  });

  test('get points for non-existent member returns 404', async () => {
    const res = await request(BASE_URL).get('/api/v1/members/nonexistent-id/points');
    expect(res.status).toBe(404);
  });

  test('get member preferences', async () => {
    const res = await request(BASE_URL).get(`/api/v1/members/${userId}/preferences`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('favorite_categories');
  });
});
