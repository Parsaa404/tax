const express = require('express');
const Joi = require('joi');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const employeeSchema = Joi.object({
  name: Joi.string().required(),
  ic_number: Joi.string().allow('', null),
  passport_number: Joi.string().allow('', null),
  date_of_birth: Joi.date().required(),
  gender: Joi.string().valid('male', 'female').default('male'),
  is_muslim: Joi.boolean().default(false),
  is_foreign: Joi.boolean().default(false),
  email: Joi.string().email().allow('', null),
  phone: Joi.string().allow('', null),
  employment_date: Joi.date().required(),
  basic_salary: Joi.number().positive().required(),
  salary_type: Joi.string().valid('monthly', 'hourly', 'daily').default('monthly'),
  employment_type: Joi.string().valid('full_time', 'part_time', 'contract').default('full_time'),
  epf_number: Joi.string().allow('', null),
  socso_number: Joi.string().allow('', null),
  income_tax_number: Joi.string().allow('', null),
  spouse_status: Joi.number().integer().min(0).max(1).default(0),
  num_children: Joi.number().integer().min(0).default(0),
});

// GET /api/employees
router.get('/', async (req, res) => {
  try {
    const employees = await db('employees')
      .where({ company_id: req.user.companyId })
      .orderBy('name');
    res.json({ data: employees });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/employees/:id
router.get('/:id', async (req, res) => {
  try {
    const employee = await db('employees')
      .where({ id: req.params.id, company_id: req.user.companyId })
      .first();
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json({ data: employee });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/employees
router.post('/', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const { error, value } = employeeSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const [employee] = await db('employees')
      .insert({ ...value, company_id: req.user.companyId })
      .returning('*');

    res.status(201).json({ message: 'Employee created', data: employee });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/employees/:id
router.put('/:id', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const existing = await db('employees')
      .where({ id: req.params.id, company_id: req.user.companyId }).first();
    if (!existing) return res.status(404).json({ error: 'Employee not found' });

    const [updated] = await db('employees')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: new Date() })
      .returning('*');

    res.json({ message: 'Employee updated', data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE (terminate) /api/employees/:id
router.delete('/:id', requireRole('owner'), async (req, res) => {
  try {
    const [terminated] = await db('employees')
      .where({ id: req.params.id, company_id: req.user.companyId })
      .update({ status: 'terminated', termination_date: new Date(), updated_at: new Date() })
      .returning('id');
    if (!terminated) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee terminated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
