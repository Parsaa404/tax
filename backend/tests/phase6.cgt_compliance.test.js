/**
 * Phase 6 Tests: CGT Disposals & Audit Trail
 */
const request = require('supertest');
const app = require('../src/app');
const { db } = require('../src/config/database');

let authToken, companyId;
let cgtDisposalId;

beforeAll(async () => {
  const reg = await request(app).post('/api/auth/register').send({
    name: 'CGT Owner', email: `cgt_${Date.now()}@test.com`, password: 'Test@12345',
    company_name: 'CGT Test Sdn Bhd', registration_number: 'CGT-001', paid_up_capital: 100000
  });
  authToken = reg.body.token;
  companyId = reg.body.company.id;
});

afterAll(async () => {
  if (companyId) {
    await db('cgt_disposals').where({ company_id: companyId }).delete();
    await db('audit_log').where({ company_id: companyId }).delete();
    await db('users').where({ company_id: companyId }).delete();
    await db('companies').where({ id: companyId }).delete();
  }
  await db.destroy();
});

describe('Phase 6 - CGT Disposals', () => {
  test('Calculate and record unlisted share disposal (10% CGT)', async () => {
    const res = await request(app)
      .post('/api/cgt')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        share_name: 'Test Private Ltd',
        acquisition_date: '2020-01-01',
        disposal_date: '2026-05-15',
        acquisition_cost: 100000,
        consideration_received: 250000,
        incidental_costs_disposal: 10000, // Net consideration = 240k, Gain = 140k
        is_listed: false
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.gross_gain).toBe('140000.00');
    expect(res.body.data.cgt_payable).toBe('14000.00'); // 10% of 140k
    cgtDisposalId = res.body.data.id;
  });

  test('Listed shares are exempt from CGT', async () => {
    const res = await request(app)
      .post('/api/cgt')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        share_name: 'Maybank Berhad',
        acquisition_date: '2023-01-01',
        disposal_date: '2026-06-01',
        acquisition_cost: 50000,
        consideration_received: 80000,
        is_listed: true // Bursa listed -> exempt
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.cgt_payable).toBe('0.00');
  });

  test('Can fetch CGT disposals summary', async () => {
    const res = await request(app)
      .get('/api/cgt/summary/2026')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.total_disposals).toBe(2);
    expect(res.body.data.total_cgt_payable).toBe(14000);
  });
});

describe('Phase 6 - Immutable Audit Log', () => {
  test('Audit log recorded the CGT creation', async () => {
    const res = await request(app)
      .get('/api/cgt/meta/audit-log?entity_type=cgt_disposal')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].action).toBe('CREATE');
  });
});
