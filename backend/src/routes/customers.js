const express = require('express');
const Joi = require('joi');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const customers = await db('customers')
      .where({ company_id: req.user.companyId, is_active: true })
      .orderBy('name');
    res.json({ data: customers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
  try {
    const customer = await db('customers')
      .where({ id: req.params.id, company_id: req.user.companyId }).first();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ data: customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers
router.post('/', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
      registration_number: Joi.string().allow('', null),
      tax_number: Joi.string().allow('', null),
      email: Joi.string().email().allow('', null),
      phone: Joi.string().allow('', null),
      address: Joi.string().allow('', null),
      country: Joi.string().length(2).default('MY'),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const [customer] = await db('customers')
      .insert({ ...value, company_id: req.user.companyId }).returning('*');
    res.status(201).json({ message: 'Customer created', data: customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:id
router.put('/:id', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const [updated] = await db('customers')
      .where({ id: req.params.id, company_id: req.user.companyId })
      .update({ ...req.body, updated_at: new Date() }).returning('*');
    if (!updated) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer updated', data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
