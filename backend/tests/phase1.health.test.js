/**
 * Phase 1 Tests: Database connection + Health Check
 */
const request = require('supertest');
const app = require('../src/app');
const { db, testConnection } = require('../src/config/database');

describe('Phase 1 - Foundation', () => {
  afterAll(async () => {
    await db.destroy();
  });

  test('Database connection is working', async () => {
    const connected = await testConnection();
    expect(connected).toBe(true);
  });

  test('GET /api/health returns 200 with connected status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('MYTax Backend');
    expect(res.body.database).toBe('connected');
    expect(res.body.timestamp).toBeDefined();
  });

  test('Unknown routes return 404', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.statusCode).toBe(404);
  });
});
