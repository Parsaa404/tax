const express = require('express');
const Joi = require('joi');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const accountSchema = Joi.object({
  account_code: Joi.string().required(),
  account_name: Joi.string().required(),
  account_type: Joi.string().valid('asset', 'liability', 'equity', 'revenue', 'expense').required(),
  parent_id: Joi.string().uuid().allow(null),
  description: Joi.string().allow('', null),
});

// GET /api/accounts
router.get('/', async (req, res) => {
  try {
    const { account_type, is_active } = req.query;
    let query = db('accounts').where({ company_id: req.user.companyId });
    if (account_type) query = query.where({ account_type });
    if (is_active !== undefined) query = query.where({ is_active: is_active === 'true' });
    const accounts = await query.orderBy('account_code');
    res.json({ data: accounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/:id
router.get('/:id', async (req, res) => {
  try {
    const account = await db('accounts')
      .where({ id: req.params.id, company_id: req.user.companyId })
      .first();
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({ data: account });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts
router.post('/', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const { error, value } = accountSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const [account] = await db('accounts')
      .insert({ ...value, company_id: req.user.companyId })
      .returning('*');

    res.status(201).json({ message: 'Account created', data: account });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Account code already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/accounts/:id
router.put('/:id', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const account = await db('accounts')
      .where({ id: req.params.id, company_id: req.user.companyId, is_system: false })
      .first();
    if (!account) return res.status(404).json({ error: 'Account not found or system account' });

    const [updated] = await db('accounts')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: new Date() })
      .returning('*');

    res.json({ message: 'Account updated', data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', requireRole('owner'), async (req, res) => {
  try {
    const account = await db('accounts')
      .where({ id: req.params.id, company_id: req.user.companyId, is_system: false })
      .first();
    if (!account) return res.status(404).json({ error: 'Account not found or cannot delete system account' });

    // Check if account has journal lines
    const lines = await db('journal_lines').where({ account_id: req.params.id }).count('id as count').first();
    if (parseInt(lines.count) > 0) {
      return res.status(409).json({ error: 'Cannot delete account with transactions. Deactivate instead.' });
    }

    await db('accounts').where({ id: req.params.id }).delete();
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
