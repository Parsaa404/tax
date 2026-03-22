const express = require('express');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/companies/me
router.get('/me', async (req, res) => {
  try {
    const company = await db('companies').where({ id: req.user.companyId }).first();
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ data: company });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/companies/me
router.put('/me', requireRole('owner'), async (req, res) => {
  try {
    const allowedFields = [
      'name', 'registration_number', 'tax_number', 'company_type',
      'paid_up_capital', 'annual_revenue', 'financial_year_end',
      'address', 'phone', 'email', 'is_sme', 'is_part_of_large_group', 'tax_resident',
    ];
    const updates = {};
    allowedFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const [updated] = await db('companies')
      .where({ id: req.user.companyId })
      .update({ ...updates, updated_at: new Date() })
      .returning('*');

    res.json({ message: 'Company updated', data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
