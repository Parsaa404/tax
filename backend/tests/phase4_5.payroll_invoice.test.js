/**
 * Phase 4 & 5 Tests: Payroll + Invoices & e-Invoice
 */
const request = require('supertest');
const app = require('../src/app');
const { db } = require('../src/config/database');
const payrollService = require('../src/services/payrollService');

let authToken, companyId;

beforeAll(async () => {
  const reg = await request(app).post('/api/auth/register').send({
    name: 'Payroll Owner',
    email: `payroll_${Date.now()}@mytaxtest.com`,
    password: 'Test@12345',
    company_name: 'Payroll Test Sdn Bhd',
    registration_number: `PR-${Date.now()}`,
    paid_up_capital: 1000000,
  });
  if (reg.statusCode !== 201) {
    console.error('Registration failed:', JSON.stringify(reg.body));
  }
  authToken = reg.body.token;
  companyId = reg.body.company.id;
});

afterAll(async () => {
  if (companyId) {
    // Delete in FK dependency order to avoid RESTRICT violations
    await db('payroll_items').whereIn(
      'payroll_run_id',
      db('payroll_runs').where({ company_id: companyId }).select('id')
    ).delete();
    await db('payroll_runs').where({ company_id: companyId }).delete();
    await db('employees').where({ company_id: companyId }).delete();
    await db('einvoices').where({ company_id: companyId }).delete();
    await db('invoice_items').whereIn(
      'invoice_id',
      db('invoices').where({ company_id: companyId }).select('id')
    ).delete();
    await db('invoices').where({ company_id: companyId }).delete();
    await db('customers').where({ company_id: companyId }).delete();
    await db('companies').where({ id: companyId }).delete();
  }
  await db.destroy();
});

// ─── PAYROLL UNIT TESTS ───────────────────────────────────────────────────────
describe('Phase 4 - Payroll Service (Unit Tests)', () => {
  describe('EPF Calculation', () => {
    test('Employee RM5000 salary: employee 11% = RM550, employer 13% = RM650', () => {
      const result = payrollService.calculateEPF(5000, 30, false);
      expect(result.employee).toBeCloseTo(550, 1);
      expect(result.employer).toBeCloseTo(650, 1);
      expect(result.employee_rate).toBe(0.11);
      expect(result.employer_rate).toBe(0.13);
    });

    test('Employee RM6000 salary (above 5k): employer rate drops to 12%', () => {
      const result = payrollService.calculateEPF(6000, 30, false);
      expect(result.employee).toBeCloseTo(660, 1);
      expect(result.employer).toBeCloseTo(720, 1);
      expect(result.employer_rate).toBe(0.12);
    });

    test('Senior employee (age 60+): employee 5.5%, employer 4%', () => {
      const result = payrollService.calculateEPF(5000, 61, false);
      expect(result.employee_rate).toBe(0.055);
      expect(result.employer_rate).toBe(0.04);
      expect(result.employee).toBeCloseTo(275, 1);
      expect(result.employer).toBeCloseTo(200, 1);
    });

    test('Foreign worker: EPF = 0', () => {
      const result = payrollService.calculateEPF(5000, 30, true);
      expect(result.employee).toBe(0);
      expect(result.employer).toBe(0);
    });
  });

  describe('SOCSO Calculation', () => {
    test('Employee RM4000 salary: employee 0.5% = RM20, employer 1.75% = RM70', () => {
      const result = payrollService.calculateSOCSO(4000, 30, false);
      expect(result.employee).toBeCloseTo(20, 1);
      expect(result.employer).toBeCloseTo(70, 1);
    });

    test('Salary above RM4000 is capped at RM4000 for SOCSO', () => {
      const high = payrollService.calculateSOCSO(8000, 30, false);
      const cap = payrollService.calculateSOCSO(4000, 30, false);
      expect(high.employee).toBeCloseTo(cap.employee, 1);
      expect(high.employer).toBeCloseTo(cap.employer, 1);
    });

    test('Senior (60+): employee SOCSO = 0, employer 1.25%', () => {
      const result = payrollService.calculateSOCSO(4000, 62, false);
      expect(result.employee).toBe(0);
      expect(result.employer).toBeCloseTo(50, 1); // 4000 × 1.25%
    });
  });

  describe('EIS Calculation', () => {
    test('Employee RM3000 salary: employee 0.2% = RM6, employer 0.2% = RM6', () => {
      const result = payrollService.calculateEIS(3000, 30, false);
      expect(result.employee).toBeCloseTo(6, 1);
      expect(result.employer).toBeCloseTo(6, 1);
    });

    test('EIS capped at RM4000 insurable salary', () => {
      const result = payrollService.calculateEIS(8000, 30, false);
      expect(result.employee).toBeCloseTo(8, 1); // 4000 × 0.2%
    });

    test('Employee age 57+ exempt from EIS', () => {
      const result = payrollService.calculateEIS(5000, 58, false);
      expect(result.employee).toBe(0);
      expect(result.employer).toBe(0);
    });
  });

  describe('PCB Calculation', () => {
    test('Low income RM800/month: no PCB (annual taxable income in 0% band)', () => {
      // RM800×12=RM9600 annual, minus RM9000 relief = RM600 taxable → 0% band
      const result = payrollService.calculatePCB(800, 0, 0, false);
      expect(result.monthly_pcb).toBe(0);
    });

    test('Income RM8000/month, single: PCB is positive', () => {
      const result = payrollService.calculatePCB(8000, 0, 0, false);
      expect(result.monthly_pcb).toBeGreaterThan(0);
      expect(result.annual_income).toBe(96000);
    });

    test('Married with 2 children reduces PCB vs single', () => {
      const single = payrollService.calculatePCB(8000, 0, 0, false);
      const married = payrollService.calculatePCB(8000, 1, 2, false);
      expect(married.monthly_pcb).toBeLessThan(single.monthly_pcb);
    });
  });

  describe('Full Payroll Calculation', () => {
    test('RM5000 basic salary full calculation produces correct net', () => {
      const employee = {
        basic_salary: 5000,
        date_of_birth: '1990-01-01',
        is_foreign: false,
        is_muslim: false,
        spouse_status: 0,
        num_children: 0,
      };
      const result = payrollService.calculateEmployeePayroll(employee);
      // EPF: 550 employee, 650 employer
      // SOCSO: 20 employee, 70 employer
      // EIS: 8 employee (capped), 8 employer
      expect(result.epf_employee).toBeCloseTo(550, 0);
      expect(result.epf_employer).toBeCloseTo(650, 0);
      expect(result.socso_employee).toBeCloseTo(20, 0);
      expect(result.net_salary).toBeLessThan(5000);
      expect(result.net_salary).toBeGreaterThan(4000);
      expect(result.employer_cost).toBeGreaterThan(5000);
    });

    test('Muslim employee gets Zakat calculated', () => {
      const employee = {
        basic_salary: 6000,
        date_of_birth: '1985-06-01',
        is_foreign: false,
        is_muslim: true,
        spouse_status: 0,
        num_children: 0,
      };
      const result = payrollService.calculateEmployeePayroll(employee);
      expect(result.zakat).toBeGreaterThan(0);
    });
  });
});

// ─── PAYROLL API TESTS ────────────────────────────────────────────────────────
describe('Phase 4 - Payroll API', () => {
  let employeeId, payrollRunId;

  test('Create employee', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Ahmad bin Ali',
        date_of_birth: '1988-05-15',
        employment_date: '2022-01-01',
        basic_salary: 5000,
        epf_number: 'EPF-001',
        is_muslim: true,
        spouse_status: 1,
        num_children: 2,
      });
    expect(res.statusCode).toBe(201);
    employeeId = res.body.data.id;
  });

  test('Preview payroll for one employee', async () => {
    const res = await request(app)
      .post('/api/payroll/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ employee_id: employeeId, bonus: 500 });
    expect(res.statusCode).toBe(200);
    expect(parseFloat(res.body.data.gross_salary)).toBeCloseTo(5500, 1);
    expect(parseFloat(res.body.data.net_salary)).toBeLessThan(5500);
  });

  test('Run payroll for March 2024', async () => {
    const res = await request(app)
      .post('/api/payroll/run')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        year: 2024,
        month: 3,
        overrides: [{ employee_id: employeeId, bonus: 500 }],
      });
    expect(res.statusCode).toBe(201);
    payrollRunId = res.body.data.id;  // assign BEFORE assertions
    expect(parseFloat(res.body.data.total_gross)).toBeGreaterThan(0);
  });

  test('Cannot run payroll for same month twice', async () => {
    const res = await request(app)
      .post('/api/payroll/run')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ year: 2024, month: 3 });
    expect(res.statusCode).toBe(409);
  });

  test('Get payroll run with items', async () => {
    const res = await request(app)
      .get(`/api/payroll/runs/${payrollRunId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].employee_name).toBe('Ahmad bin Ali');
  });

  test('Approve payroll run', async () => {
    const res = await request(app)
      .put(`/api/payroll/runs/${payrollRunId}/approve`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('approved');
  });
});

// ─── INVOICE & E-INVOICE TESTS ────────────────────────────────────────────────
describe('Phase 5 - Invoices & e-Invoice', () => {
  let customerId, invoiceId;

  test('Create customer', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Syarikat ABC Sdn Bhd',
        registration_number: 'ABC-123456',
        tax_number: 'C12345678',
        email: 'abc@test.com',
        country: 'MY',
      });
    expect(res.statusCode).toBe(201);
    customerId = res.body.data.id;
  });

  test('Create invoice with SST calculation', async () => {
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: customerId,
        invoice_number: `INV-${Date.now()}`,
        issue_date: '2024-06-01',
        due_date: '2024-06-30',
        tax_type: 'SST',
        items: [
          { description: 'Consulting Services', quantity: 1, unit_price: 10000 },
          { description: 'Software License', quantity: 2, unit_price: 2500 },
        ],
      });
    expect(res.statusCode).toBe(201);
    const inv = res.body.data;
    invoiceId = inv.id;
    // subtotal = 10000 + 5000 = 15000
    // SST 8% = 1200
    // total = 16200
    expect(parseFloat(inv.subtotal)).toBeCloseTo(15000, 2);
    expect(parseFloat(inv.tax_amount)).toBeCloseTo(1200, 2);
    expect(parseFloat(inv.total_amount)).toBeCloseTo(16200, 2);
  });

  test('Fetch invoice with line items', async () => {
    const res = await request(app)
      .get(`/api/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.customer_name).toBe('Syarikat ABC Sdn Bhd');
  });

  test('Submit e-Invoice to mock LHDN', async () => {
    const res = await request(app)
      .post(`/api/einvoices/submit/${invoiceId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(201);
    expect(res.body.data.uuid).toBeDefined();
    expect(res.body.data.validation_status).toBe('pending');

    // Check e-Invoice status
    const statusRes = await request(app)
      .get(`/api/einvoices/status/${res.body.data.uuid}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(statusRes.statusCode).toBe(200);
    expect(statusRes.body.data.validation_status).toBe('valid');
    expect(statusRes.body.data.qr_code_url).toBeDefined();
  });

  test('Cannot submit same invoice twice', async () => {
    const res = await request(app)
      .post(`/api/einvoices/submit/${invoiceId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(409);
  });

  test('Update invoice status to paid', async () => {
    const res = await request(app)
      .put(`/api/invoices/${invoiceId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'paid' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('paid');
  });
});

// ─── AI SUGGESTIONS TESTS ─────────────────────────────────────────────────────
describe('AI Categorization & Optimization (Rule-based fallback)', () => {
  test('Categorizes "office rent payment" as rent/expense', async () => {
    const res = await request(app)
      .post('/api/ai/categorize')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ description: 'Office rent payment for March' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.category).toBe('rent');
    expect(res.body.data.transaction_type).toBe('expense');
    expect(res.body.data.is_tax_deductible).toBe(true);
  });

  test('Categorizes "purchase laptop" as computers/asset', async () => {
    const res = await request(app)
      .post('/api/ai/categorize')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ description: 'Purchase laptop for developer' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.category).toBe('computers');
    expect(res.body.data.transaction_type).toBe('asset');
    expect(res.body.data.is_aca_eligible).toBe(true);
  });

  test('Tax optimization returns suggestions', async () => {
    const res = await request(app)
      .post('/api/ai/optimize')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ year_of_assessment: 2024 });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.suggestions).toBeDefined();
    expect(Array.isArray(res.body.data.suggestions)).toBe(true);
  });
});
