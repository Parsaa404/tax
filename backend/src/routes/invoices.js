const express = require('express');
const Joi = require('joi');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const taxService = require('../services/taxService');

const router = express.Router();
router.use(authenticate);

const invoiceItemSchema = Joi.object({
  description: Joi.string().required(),
  quantity: Joi.number().positive().default(1),
  unit_price: Joi.number().positive().required(),
});

const invoiceSchema = Joi.object({
  customer_id: Joi.string().uuid().required(),
  invoice_number: Joi.string().required(),
  issue_date: Joi.date().required(),
  due_date: Joi.date().allow(null),
  tax_type: Joi.string().valid('SST', 'GST', 'none').default('SST'),
  notes: Joi.string().allow('', null),
  items: Joi.array().items(invoiceItemSchema).min(1).required(),
});

// GET /api/invoices
router.get('/', async (req, res) => {
  try {
    const { status, from, to, page = 1, limit = 50 } = req.query;
    let query = db('invoices as i')
      .join('customers as c', 'i.customer_id', 'c.id')
      .where('i.company_id', req.user.companyId)
      .select('i.*', 'c.name as customer_name')
      .orderBy('i.issue_date', 'desc');

    if (status) query = query.where('i.status', status);
    if (from) query = query.where('i.issue_date', '>=', from);
    if (to) query = query.where('i.issue_date', '<=', to);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const invoices = await query.limit(parseInt(limit)).offset(offset);
    res.json({ data: invoices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/:id with items
router.get('/:id', async (req, res) => {
  try {
    const invoice = await db('invoices as i')
      .join('customers as c', 'i.customer_id', 'c.id')
      .where('i.id', req.params.id).where('i.company_id', req.user.companyId)
      .select('i.*', 'c.name as customer_name', 'c.tax_number as customer_tax').first();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const items = await db('invoice_items').where({ invoice_id: req.params.id }).orderBy('line_number');
    res.json({ data: { ...invoice, items } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices
router.post('/', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const { error, value } = invoiceSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const customer = await db('customers')
      .where({ id: value.customer_id, company_id: req.user.companyId }).first();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Calculate totals
    const subtotal = value.items.reduce((s, item) => s + item.quantity * item.unit_price, 0);
    const sstCalc = value.tax_type === 'SST' ? taxService.calculateSST(subtotal) : { tax_amount: 0, rate: 0 };
    const total_amount = subtotal + sstCalc.tax_amount;

    const result = await db.transaction(async (trx) => {
      const [invoice] = await trx('invoices').insert({
        company_id: req.user.companyId,
        customer_id: value.customer_id,
        invoice_number: value.invoice_number,
        issue_date: value.issue_date,
        due_date: value.due_date,
        subtotal,
        tax_type: value.tax_type,
        tax_rate: sstCalc.rate * 100,
        tax_amount: sstCalc.tax_amount,
        total_amount,
        notes: value.notes,
        status: 'draft',
        created_by: req.user.userId,
      }).returning('*');

      const items = value.items.map((item, idx) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
        line_number: idx + 1,
      }));
      await trx('invoice_items').insert(items);

      return invoice;
    });

    res.status(201).json({ message: 'Invoice created', data: result });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Invoice number already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/invoices/:id/status
router.put('/:id/status', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['draft', 'sent', 'paid', 'cancelled', 'void'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const [updated] = await db('invoices')
      .where({ id: req.params.id, company_id: req.user.companyId })
      .update({ status, updated_at: new Date() }).returning('*');
    if (!updated) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'Invoice status updated', data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
