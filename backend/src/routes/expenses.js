const express = require('express');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const { category, from, to, status } = req.query;
    let query = db('expenses').where({ company_id: req.user.companyId }).orderBy('expense_date', 'desc');
    if (category) query = query.where({ category });
    if (from) query = query.where('expense_date', '>=', from);
    if (to) query = query.where('expense_date', '<=', to);
    if (status) query = query.where({ status });
    const expenses = await query;
    res.json({ data: expenses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/expenses
router.post('/', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const { vendor_name, expense_date, amount, category, description, is_tax_deductible, deductible_rate, tax_type, tax_amount } = req.body;
    if (!expense_date || !amount) return res.status(400).json({ error: 'expense_date and amount are required' });

    const [expense] = await db('expenses').insert({
      company_id: req.user.companyId,
      vendor_name, expense_date, amount, category: category || 'other',
      description, is_tax_deductible: is_tax_deductible !== false,
      deductible_rate: deductible_rate || 100,
      tax_type: tax_type || 'none', tax_amount: tax_amount || 0,
      status: 'pending', created_by: req.user.userId,
    }).returning('*');

    res.status(201).json({ message: 'Expense recorded', data: expense });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/expenses/:id/approve
router.put('/:id/approve', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const [updated] = await db('expenses')
      .where({ id: req.params.id, company_id: req.user.companyId })
      .update({ status: 'approved', updated_at: new Date() }).returning('*');
    if (!updated) return res.status(404).json({ error: 'Expense not found' });
    res.json({ message: 'Expense approved', data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
