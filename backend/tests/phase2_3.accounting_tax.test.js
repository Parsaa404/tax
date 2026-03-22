/**
 * Phase 2 & 3 Tests: Accounting Core + Tax Engine
 * Tests auth, double-entry, trial balance, CIT, SST, WHT, Capital Allowance
 */
const request = require('supertest');
const app = require('../src/app');
const { db } = require('../src/config/database');
const taxService = require('../src/services/taxService');

let authToken, companyId, userId;
let cashAccountId, revenueAccountId, receivableAccountId;

beforeAll(async () => {
  // Register a test company
  const reg = await request(app).post('/api/auth/register').send({
    name: 'Test Owner',
    email: `test_${Date.now()}@mytaxtest.com`,
    password: 'Test@12345',
    company_name: 'MYTax Test Sdn Bhd',
    registration_number: `TEST-${Date.now()}`,
    company_type: 'Sdn Bhd',
    paid_up_capital: 500000,
    financial_year_end: 12,
  });
  if (reg.statusCode !== 201) {
    console.error('Registration failed:', JSON.stringify(reg.body));
  }
  expect(reg.statusCode).toBe(201);
  authToken = reg.body.token;
  companyId = reg.body.company.id;
  userId = reg.body.user.id;

  // Get system accounts
  const accts = await request(app)
    .get('/api/accounts')
    .set('Authorization', `Bearer ${authToken}`);
  const accounts = accts.body.data;
  cashAccountId = accounts.find((a) => a.account_code === '1100')?.id;
  revenueAccountId = accounts.find((a) => a.account_code === '4100')?.id;
  receivableAccountId = accounts.find((a) => a.account_code === '1200')?.id;
});

afterAll(async () => {
  if (companyId) {
    // Delete in FK dependency order to avoid RESTRICT violations
    await db('journal_lines').whereIn(
      'journal_entry_id',
      db('journal_entries').where({ company_id: companyId }).select('id')
    ).delete();
    await db('journal_entries').where({ company_id: companyId }).delete();
    await db('transactions').where({ company_id: companyId }).delete();
    await db('tax_computations').where({ company_id: companyId }).delete();
    await db('users').where({ company_id: companyId }).delete();
    await db('accounts').where({ company_id: companyId }).delete();
    await db('companies').where({ id: companyId }).delete();
  }
  await db.destroy();
});

// ─── AUTH TESTS ──────────────────────────────────────────────────────────────
describe('Phase 1 & 2 - Auth & Company', () => {
  test('Health check passes', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
  });

  test('Cannot register with duplicate email', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Duplicate',
      email: `test_${Date.now()}@mytax.test`,
      password: 'Test@12345',
      company_name: 'Another Co',
    });
    // First register the email
    const email = reg.body.user?.email || `dup_${Date.now()}@mytax.test`;
    const dup = await request(app).post('/api/auth/register').send({
      name: 'Dup User',
      email: reg.body.user?.email || email,
      password: 'Test@12345',
      company_name: 'Dup Company',
    });
    expect([409, 400, 500]).toContain(dup.statusCode);
  });

  test('Login with correct credentials returns token', async () => {
    // We need to know the email used in register
    const user = await db('users').where({ id: userId }).first();
    const login = await request(app).post('/api/auth/login').send({
      email: user.email,
      password: 'Test@12345',
    });
    expect(login.statusCode).toBe(200);
    expect(login.body.token).toBeDefined();
  });

  test('Login with wrong password returns 401', async () => {
    const user = await db('users').where({ id: userId }).first();
    const login = await request(app).post('/api/auth/login').send({
      email: user.email,
      password: 'WrongPassword',
    });
    expect(login.statusCode).toBe(401);
  });

  test('Protected route requires token', async () => {
    const res = await request(app).get('/api/accounts');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/companies/me returns company data', async () => {
    const res = await request(app)
      .get('/api/companies/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe('MYTax Test Sdn Bhd');
    expect(res.body.data.is_sme).toBe(true);
  });

  test('Registration seeded default Chart of Accounts', async () => {
    const res = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(30);
    // Check key accounts exist
    const codes = res.body.data.map((a) => a.account_code);
    expect(codes).toContain('1100'); // Cash
    expect(codes).toContain('2200'); // SST Payable
    expect(codes).toContain('4100'); // Sales Revenue
    expect(codes).toContain('8000'); // Tax Expense
  });
});

// ─── DOUBLE-ENTRY TESTS ───────────────────────────────────────────────────────
describe('Phase 2 - Double-Entry Bookkeeping', () => {
  let transactionId;

  test('Valid double-entry transaction is posted (Dr Cash, Cr Revenue)', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        transaction_type: 'invoice',
        transaction_date: '2024-06-15',
        description: 'Service invoice payment received',
        journal_lines: [
          { account_id: cashAccountId, debit: 10000, credit: 0, description: 'Cash received' },
          { account_id: revenueAccountId, debit: 0, credit: 10000, description: 'Service revenue' },
        ],
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('posted');
    transactionId = res.body.data.id;
  });

  test('Invalid double-entry is rejected (debits ≠ credits)', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        transaction_type: 'journal',
        transaction_date: '2024-06-15',
        description: 'Invalid entry',
        journal_lines: [
          { account_id: cashAccountId, debit: 5000, credit: 0 },
          { account_id: revenueAccountId, debit: 0, credit: 3000 }, // mismatch!
        ],
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Double-entry violation');
  });

  test('Trial Balance is balanced after posting', async () => {
    const res = await request(app)
      .get('/api/reports/trial-balance')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.totals.balanced).toBe(true);
    expect(res.body.data.totals.total_debit).toBeGreaterThan(0);
    // Total debit must equal total credit
    expect(Math.abs(res.body.data.totals.total_debit - res.body.data.totals.total_credit)).toBeLessThan(0.01);
  });

  test('P&L report shows posted revenue', async () => {
    const res = await request(app)
      .get('/api/reports/profit-loss?from=2024-01-01&to=2024-12-31')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.revenue.total).toBeGreaterThanOrEqual(10000);
    expect(res.body.data.net_profit).toBeDefined();
  });

  test('Balance Sheet report returns asset/liability/equity structure', async () => {
    const res = await request(app)
      .get('/api/reports/balance-sheet')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.assets).toBeDefined();
    expect(res.body.data.liabilities).toBeDefined();
    expect(res.body.data.equity).toBeDefined();
  });

  test('Transaction can be voided (not deleted)', async () => {
    const res = await request(app)
      .delete(`/api/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('voided');
  });
});

// ─── TAX ENGINE TESTS ─────────────────────────────────────────────────────────
describe('Phase 3 - Tax Engine (Unit Tests)', () => {
  // CIT Tests
  describe('CIT - Corporate Income Tax', () => {
    test('SME: RM100k chargeable income → 15% = RM15,000', () => {
      const result = taxService.calculateCIT(100000, true, false);
      expect(result.total_tax).toBeCloseTo(15000, 2);
      expect(result.tax_on_first_band).toBeCloseTo(15000, 2);
      expect(result.is_sme).toBe(true);
    });

    test('SME: RM150k chargeable income → 15% = RM22,500', () => {
      const result = taxService.calculateCIT(150000, true, false);
      expect(result.total_tax).toBeCloseTo(22500, 2);
    });

    test('SME: RM500k chargeable income → 15% on 150k + 17% on 350k = RM82,000', () => {
      const result = taxService.calculateCIT(500000, true, false);
      // 150,000 × 15% = 22,500
      // 350,000 × 17% = 59,500
      // Total = 82,000
      expect(result.tax_on_first_band).toBeCloseTo(22500, 2);
      expect(result.tax_on_second_band).toBeCloseTo(59500, 2);
      expect(result.total_tax).toBeCloseTo(82000, 2);
    });

    test('SME: RM700k chargeable income → tiered 3 bands', () => {
      const result = taxService.calculateCIT(700000, true, false);
      // 150k × 15% = 22,500
      // 450k × 17% = 76,500
      // 100k × 24% = 24,000
      // Total = 123,000
      expect(result.tax_on_first_band).toBeCloseTo(22500, 2);
      expect(result.tax_on_second_band).toBeCloseTo(76500, 2);
      expect(result.tax_on_remainder).toBeCloseTo(24000, 2);
      expect(result.total_tax).toBeCloseTo(123000, 2);
    });

    test('Non-SME: RM500k chargeable income → flat 24% = RM120,000', () => {
      const result = taxService.calculateCIT(500000, false, false);
      expect(result.total_tax).toBeCloseTo(120000, 2);
      expect(result.is_sme).toBe(false);
    });

    test('Part of large group → flat 24% even if paid-up ≤ RM2.5M', () => {
      const result = taxService.calculateCIT(300000, true, true);
      expect(result.total_tax).toBeCloseTo(72000, 2); // 24%
    });

    test('Zero chargeable income → zero tax', () => {
      const result = taxService.calculateCIT(0, true, false);
      expect(result.total_tax).toBe(0);
    });
  });

  // SST Tests
  describe('SST - Sales & Service Tax', () => {
    test('Service tax 8% on RM10,000 → RM800 tax, RM10,800 total', () => {
      const result = taxService.calculateSST(10000, 'service');
      expect(result.tax_amount).toBeCloseTo(800, 2);
      expect(result.total).toBeCloseTo(10800, 2);
      expect(result.rate).toBe(0.08);
    });

    test('Sales tax 10% on RM5,000 → RM500 tax', () => {
      const result = taxService.calculateSST(5000, 'sales_standard');
      expect(result.tax_amount).toBeCloseTo(500, 2);
    });

    test('Zero-rated SST → no tax', () => {
      const result = taxService.calculateSST(10000, 'zero');
      expect(result.tax_amount).toBe(0);
      expect(result.total).toBe(10000);
    });
  });

  // Withholding Tax Tests
  describe('Withholding Tax', () => {
    test('Royalty WHT 10% on RM50,000', () => {
      const result = taxService.calculateWithholdingTax(50000, 'royalty');
      expect(result.tax_amount).toBeCloseTo(5000, 2);
      expect(result.net_payment).toBeCloseTo(45000, 2);
    });

    test('Interest WHT 15% on RM20,000', () => {
      const result = taxService.calculateWithholdingTax(20000, 'interest');
      expect(result.tax_amount).toBeCloseTo(3000, 2);
      expect(result.rate).toBe(0.15);
    });

    test('Dividends → 0% WHT (single-tier)', () => {
      const result = taxService.calculateWithholdingTax(100000, 'dividends');
      expect(result.tax_amount).toBe(0);
      expect(result.net_payment).toBe(100000);
    });
  });

  // Capital Allowance Tests
  describe('Capital Allowance', () => {
    test('Plant & Machinery Year 1: IA 20% + AA 20% = 40% of cost', () => {
      const result = taxService.calculateCapitalAllowance({
        cost: 100000,
        acquisition_date: '2024-01-01',
        category: 'plant_machinery',
        year_of_assessment: 2024,
      });
      expect(result.ia).toBeCloseTo(20000, 2);
      expect(result.aa).toBeCloseTo(20000, 2);
      expect(result.total_ca).toBeCloseTo(40000, 2);
      expect(result.is_year_1).toBe(true);
    });

    test('Plant & Machinery Year 2: IA = 0, only AA', () => {
      const result = taxService.calculateCapitalAllowance({
        cost: 100000,
        acquisition_date: '2023-01-01',
        category: 'plant_machinery',
        year_of_assessment: 2024,
      });
      expect(result.ia).toBe(0);
      expect(result.aa).toBeGreaterThan(0);
      expect(result.is_year_1).toBe(false);
    });

    test('Computer ACA: 100% write-off in year 1', () => {
      const result = taxService.calculateCapitalAllowance({
        cost: 50000,
        acquisition_date: '2024-01-01',
        category: 'computers',
        year_of_assessment: 2024,
      });
      expect(result.aa).toBeCloseTo(50000, 2);
      expect(result.total_ca).toBeCloseTo(50000, 2);
      expect(result.residual_expenditure).toBe(0);
    });
  });

  // Full Tax Computation via API
  describe('Full Tax Computation API', () => {
    test('POST /api/tax/compute runs and stores result', async () => {
      const res = await request(app)
        .post('/api/tax/compute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          year_of_assessment: 2024,
          gross_revenue: 2000000,
          total_allowable_expenses: 1400000,
          total_capital_allowance: 100000,
          losses_brought_forward: 0,
          zakat_paid: 0,
          cp204_paid: 50000,
        });
      expect(res.statusCode).toBe(200);
      const data = res.body.data;
      // chargeable = 2M - 1.4M - 100k = 500k
      expect(parseFloat(data.chargeable_income)).toBeCloseTo(500000, 0);
      // SME: 150k×15% + 350k×17% = 22500 + 59500 = 82000
      expect(parseFloat(data.tax_before_rebates)).toBeCloseTo(82000, 0);
      expect(parseFloat(data.balance_tax_payable)).toBeCloseTo(32000, 0); // 82000 - 50000
    });

    test('GET /api/tax/computation/2024 retrieves stored computation', async () => {
      const res = await request(app)
        .get('/api/tax/computation/2024')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.year_of_assessment).toBe(2024);
    });
  });
});
