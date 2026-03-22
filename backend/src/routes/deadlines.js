const express = require('express');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/deadlines
router.get('/', async (req, res) => {
  try {
    const { upcoming_days, type, completed } = req.query;
    let query = db('tax_deadlines')
      .where({ company_id: req.user.companyId })
      .orderBy('due_date', 'asc');

    if (upcoming_days) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(upcoming_days));
      query = query.where('due_date', '<=', futureDate.toISOString().split('T')[0]);
    }
    if (type) query = query.where({ deadline_type: type });
    if (completed !== undefined) query = query.where({ is_completed: completed === 'true' });

    const deadlines = await query;
    res.json({ data: deadlines });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/deadlines
router.post('/', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const { title, description, deadline_type, due_date, priority } = req.body;
    if (!title || !deadline_type || !due_date) {
      return res.status(400).json({ error: 'title, deadline_type, due_date are required' });
    }
    const [deadline] = await db('tax_deadlines').insert({
      company_id: req.user.companyId,
      title, description, deadline_type, due_date,
      priority: priority || 'medium',
    }).returning('*');
    res.status(201).json({ message: 'Deadline created', data: deadline });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/deadlines/:id/complete
router.put('/:id/complete', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const [updated] = await db('tax_deadlines')
      .where({ id: req.params.id, company_id: req.user.companyId })
      .update({ is_completed: true, completed_date: new Date(), updated_at: new Date() })
      .returning('*');
    if (!updated) return res.status(404).json({ error: 'Deadline not found' });
    res.json({ message: 'Deadline marked complete', data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/deadlines/seed-standard - seed standard Malaysian tax deadlines for a year
router.post('/seed-standard', requireRole('owner'), async (req, res) => {
  try {
    const year = req.body.year || new Date().getFullYear();
    const companyFinYearEnd = req.body.financial_year_end || 12;

    // Malaysian standard deadlines
    const standardDeadlines = [
      // Form C: 7 months after FYE
      {
        title: `Form C Submission YA${year}`,
        description: 'Corporate Income Tax Return filing',
        deadline_type: 'Form_C',
        due_date: new Date(year, companyFinYearEnd - 1 + 7, 0).toISOString().split('T')[0],
        priority: 'critical',
      },
      // CP204: Instalments (1st due 30 days before FY starts)
      {
        title: `CP204 Tax Instalment YA${year}`,
        description: 'Monthly/bi-monthly tax instalment payments',
        deadline_type: 'CP204',
        due_date: `${year}-01-15`,
        priority: 'high',
      },
      // Form E: By March 31
      {
        title: `Form E Submission ${year}`,
        description: 'Employer\'s return for all employees',
        deadline_type: 'Form_E',
        due_date: `${year}-03-31`,
        priority: 'high',
      },
      // EA Form: By last day of Feb
      {
        title: `EA Form Distribution ${year}`,
        description: 'Issue EA forms to all employees',
        deadline_type: 'EA_Form',
        due_date: `${year}-02-28`,
        priority: 'high',
      },
      // PCB: 15th of following month (12 entries)
      ...Array.from({ length: 12 }, (_, i) => ({
        title: `PCB Month ${i + 1} - ${year}`,
        description: `PCB remittance for month ${i + 1}`,
        deadline_type: 'PCB',
        due_date: new Date(year, i + 1, 15).toISOString().split('T')[0],
        priority: 'medium',
      })),
      // SST: Bi-monthly (every 2 months, by last day of 2nd month after taxable period)
      ...Array.from({ length: 6 }, (_, i) => ({
        title: `SST-02 Bi-monthly Return ${year} Period ${i + 1}`,
        description: `SST return for bi-monthly period ${i + 1}`,
        deadline_type: 'SST',
        due_date: new Date(year, (i * 2) + 2, 0).toISOString().split('T')[0],
        priority: 'high',
      })),
    ];

    const toInsert = standardDeadlines.map((d) => ({ ...d, company_id: req.user.companyId }));
    await db('tax_deadlines').insert(toInsert);

    res.status(201).json({ message: `Seeded ${toInsert.length} standard deadlines for ${year}`, count: toInsert.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
