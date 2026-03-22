const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { db } = require('../config/database');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).required(),
  company_name: Joi.string().min(2).max(200).required(),
  registration_number: Joi.string().allow('', null),
  tax_number: Joi.string().allow('', null),
  company_type: Joi.string().valid('Sdn Bhd', 'LLC', 'Sole Prop', 'Partnership', 'Other').default('Sdn Bhd'),
  paid_up_capital: Joi.number().min(0).default(0),
  financial_year_end: Joi.number().integer().min(1).max(12).default(12),
});

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required(),
});

/**
 * POST /api/auth/register
 * Creates a company + owner user
 */
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { name, email, password, company_name, registration_number, tax_number,
      company_type, paid_up_capital, financial_year_end } = value;

    // Check email uniqueness
    const existing = await db('users').where({ email }).first();
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    // Begin transaction
    const result = await db.transaction(async (trx) => {
      // Create company
      const [company] = await trx('companies').insert({
        name: company_name,
        registration_number,
        tax_number,
        company_type,
        paid_up_capital,
        financial_year_end,
        is_sme: paid_up_capital <= 2500000,
      }).returning('*');

      // Hash password
      const password_hash = await bcrypt.hash(password, 12);

      // Create owner user
      const [user] = await trx('users').insert({
        company_id: company.id,
        name,
        email,
        password_hash,
        role: 'owner',
      }).returning(['id', 'name', 'email', 'role', 'company_id']);

      // Seed default Chart of Accounts for the company
      await seedDefaultAccounts(trx, company.id);

      return { company, user };
    });

    const token = jwt.sign(
      { userId: result.user.id, companyId: result.company.id, role: 'owner' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: result.user,
      company: result.company,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed', message: err.message });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password } = value;

    const user = await db('users').where({ email, is_active: true }).first();
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    // Update last login
    await db('users').where({ id: user.id }).update({ last_login_at: new Date() });

    const company = await db('companies').where({ id: user.company_id }).first();

    const token = jwt.sign(
      { userId: user.id, companyId: user.company_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      company,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed', message: err.message });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    const user = await db('users')
      .where({ id: req.user.userId })
      .select(['id', 'name', 'email', 'role', 'company_id', 'last_login_at'])
      .first();
    const company = await db('companies').where({ id: req.user.companyId }).first();
    res.json({ user, company });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Seed default Chart of Accounts (Malaysian standard)
async function seedDefaultAccounts(trx, companyId) {
  const accounts = [
    // ASSETS (1xxx)
    { account_code: '1000', account_name: 'Current Assets',        account_type: 'asset',     is_system: true },
    { account_code: '1100', account_name: 'Cash and Bank',          account_type: 'asset',     is_system: true },
    { account_code: '1110', account_name: 'Petty Cash',             account_type: 'asset',     is_system: true },
    { account_code: '1200', account_name: 'Accounts Receivable',    account_type: 'asset',     is_system: true },
    { account_code: '1300', account_name: 'Inventory',              account_type: 'asset',     is_system: true },
    { account_code: '1400', account_name: 'Prepaid Expenses',       account_type: 'asset',     is_system: true },
    { account_code: '1500', account_name: 'Fixed Assets',           account_type: 'asset',     is_system: true },
    { account_code: '1510', account_name: 'Plant & Machinery',      account_type: 'asset',     is_system: true },
    { account_code: '1520', account_name: 'Motor Vehicles',         account_type: 'asset',     is_system: true },
    { account_code: '1530', account_name: 'Computer Equipment',     account_type: 'asset',     is_system: true },
    { account_code: '1540', account_name: 'Furniture & Fixtures',   account_type: 'asset',     is_system: true },
    { account_code: '1590', account_name: 'Accumulated Depreciation', account_type: 'asset',  is_system: true },
    // LIABILITIES (2xxx)
    { account_code: '2000', account_name: 'Current Liabilities',    account_type: 'liability', is_system: true },
    { account_code: '2100', account_name: 'Accounts Payable',       account_type: 'liability', is_system: true },
    { account_code: '2200', account_name: 'SST Payable',            account_type: 'liability', is_system: true },
    { account_code: '2300', account_name: 'EPF Payable',            account_type: 'liability', is_system: true },
    { account_code: '2310', account_name: 'SOCSO Payable',          account_type: 'liability', is_system: true },
    { account_code: '2320', account_name: 'EIS Payable',            account_type: 'liability', is_system: true },
    { account_code: '2330', account_name: 'PCB Payable',            account_type: 'liability', is_system: true },
    { account_code: '2400', account_name: 'Tax Payable (CIT)',       account_type: 'liability', is_system: true },
    { account_code: '2500', account_name: 'Loans Payable',          account_type: 'liability', is_system: true },
    // EQUITY (3xxx)
    { account_code: '3000', account_name: 'Equity',                 account_type: 'equity',    is_system: true },
    { account_code: '3100', account_name: 'Paid-up Capital',        account_type: 'equity',    is_system: true },
    { account_code: '3200', account_name: 'Retained Earnings',      account_type: 'equity',    is_system: true },
    { account_code: '3300', account_name: 'Current Year P&L',       account_type: 'equity',    is_system: true },
    // REVENUE (4xxx)
    { account_code: '4000', account_name: 'Revenue',                account_type: 'revenue',   is_system: true },
    { account_code: '4100', account_name: 'Sales Revenue',          account_type: 'revenue',   is_system: true },
    { account_code: '4200', account_name: 'Service Revenue',        account_type: 'revenue',   is_system: true },
    { account_code: '4900', account_name: 'Other Income',           account_type: 'revenue',   is_system: true },
    // EXPENSES (5xxx - 9xxx)
    { account_code: '5000', account_name: 'Cost of Goods Sold',     account_type: 'expense',   is_system: true },
    { account_code: '6000', account_name: 'Operating Expenses',     account_type: 'expense',   is_system: true },
    { account_code: '6100', account_name: 'Salaries & Wages',       account_type: 'expense',   is_system: true },
    { account_code: '6110', account_name: 'EPF Contribution (Employer)', account_type: 'expense', is_system: true },
    { account_code: '6120', account_name: 'SOCSO Contribution',     account_type: 'expense',   is_system: true },
    { account_code: '6130', account_name: 'EIS Contribution',       account_type: 'expense',   is_system: true },
    { account_code: '6200', account_name: 'Rent',                   account_type: 'expense',   is_system: true },
    { account_code: '6300', account_name: 'Utilities',              account_type: 'expense',   is_system: true },
    { account_code: '6400', account_name: 'Marketing & Advertising', account_type: 'expense',  is_system: true },
    { account_code: '6500', account_name: 'Professional Fees',      account_type: 'expense',   is_system: true },
    { account_code: '6600', account_name: 'Travel & Transport',     account_type: 'expense',   is_system: true },
    { account_code: '6700', account_name: 'Entertainment',          account_type: 'expense',   is_system: true },
    { account_code: '6800', account_name: 'Depreciation Expense',   account_type: 'expense',   is_system: true },
    { account_code: '6900', account_name: 'Insurance',              account_type: 'expense',   is_system: true },
    { account_code: '7000', account_name: 'Finance Costs',          account_type: 'expense',   is_system: true },
    { account_code: '7100', account_name: 'Interest Expense',       account_type: 'expense',   is_system: true },
    { account_code: '8000', account_name: 'Tax Expense (CIT)',      account_type: 'expense',   is_system: true },
  ];

  await trx('accounts').insert(
    accounts.map((a) => ({ ...a, company_id: companyId }))
  );
}

module.exports = router;
