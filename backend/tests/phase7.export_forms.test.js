/**
 * Phase 7 Tests: Export & Tax Form Wizards
 */
const request = require('supertest');
const app = require('../src/app');
const { db } = require('../src/config/database');

let authToken, companyId;

beforeAll(async () => {
  const reg = await request(app).post('/api/auth/register').send({
    name: 'Export Owner', email: `export_${Date.now()}@test.com`, password: 'Test@12345',
    company_name: 'Export Test Sdn Bhd', registration_number: 'EXP-123', paid_up_capital: 1000000
  });
  authToken = reg.body.token;
  companyId = reg.body.company.id;
});

afterAll(async () => {
  if (companyId) {
    await db('users').where({ company_id: companyId }).delete();
    await db('companies').where({ id: companyId }).delete();
  }
  await db.destroy();
});

describe('Phase 7 - Exports', () => {
  test('GET /api/export/transactions returns CSV', async () => {
    const res = await request(app)
      .get('/api/export/transactions')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('transaction_date,reference,description');
  });

  test('POST /api/export/cp204-wizard generates 12 instalments', async () => {
    const res = await request(app)
      .post('/api/export/cp204-wizard')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ estimated_chargeable_income: 1800000 }); // SME tier applies
    expect(res.statusCode).toBe(200);
    expect(res.body.data.instalments).toHaveLength(12);
    expect(res.body.data.effective_rate).toBeDefined();
    
    // Total of 12 instalments should roughly equal estimated tax (ceil applied)
    const sum = res.body.data.instalments.reduce((s, i) => s + i.amount, 0);
    expect(sum).toBeGreaterThanOrEqual(res.body.data.estimated_tax);
  });
});
