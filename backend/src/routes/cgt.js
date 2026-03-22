/**
 * Phase 6 — CGT Disposal Routes
 * Capital Gains Tax tracking per CGTA 2023.
 * 10% on net gains from unlisted share disposals.
 */
const express = require('express');
const Joi = require('joi');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const taxService = require('../services/taxService');

const router = express.Router();
router.use(authenticate);

// POST /api/cgt  — Record a new share disposal and compute CGT
router.post('/', requireRole('owner', 'accountant'), auditLog('cgt_disposal'), async (req, res) => {
  try {
    const schema = Joi.object({
      share_name:                Joi.string().required(),
      company_reg_no:            Joi.string().allow('', null),
      is_listed:                 Joi.boolean().default(false),
      acquisition_date:          Joi.date().iso().required(),
      disposal_date:             Joi.date().iso().required(),
      acquisition_cost:          Joi.number().min(0).required(),
      consideration_received:    Joi.number().min(0).required(),
      incidental_costs_disposal: Joi.number().min(0).default(0),
      notes:                     Joi.string().allow('', null),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Compute CGT using tax service
    const netConsideration = value.consideration_received - value.incidental_costs_disposal;
    const cgtResult = taxService.calculateCGT(
      netConsideration,
      value.acquisition_cost,
      value.is_listed
    );

    // Payment due 60 days from disposal
    const disposalDate = new Date(value.disposal_date);
    const paymentDueDate = new Date(disposalDate);
    paymentDueDate.setDate(paymentDueDate.getDate() + 60);

    const [disposal] = await db('cgt_disposals').insert({
      company_id:                req.user.companyId,
      share_name:                value.share_name,
      company_reg_no:            value.company_reg_no,
      is_listed:                 value.is_listed,
      acquisition_date:          value.acquisition_date,
      disposal_date:             value.disposal_date,
      acquisition_cost:          value.acquisition_cost,
      consideration_received:    value.consideration_received,
      incidental_costs_disposal: value.incidental_costs_disposal,
      gross_gain:                cgtResult.gross_gain,
      cgt_rate:                  cgtResult.rate,
      cgt_payable:               cgtResult.cgt_payable,
      payment_due_date:          paymentDueDate.toISOString().slice(0, 10),
      notes:                     value.notes,
    }).returning('*');

    res.status(201).json({
      message: 'CGT disposal recorded',
      data: disposal,
      computation: cgtResult,
    });
  } catch (err) {
    console.error('CGT create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cgt  — List all CGT disposals for the company
router.get('/', async (req, res) => {
  try {
    const disposals = await db('cgt_disposals')
      .where({ company_id: req.user.companyId })
      .orderBy('disposal_date', 'desc');
    const totalPayable = disposals.reduce((s, d) => s + parseFloat(d.cgt_payable || 0), 0);
    res.json({ data: disposals, summary: { total_disposals: disposals.length, total_cgt_payable: totalPayable } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cgt/:id  — Get single disposal detail
router.get('/:id', async (req, res) => {
  try {
    const disposal = await db('cgt_disposals')
      .where({ id: req.params.id, company_id: req.user.companyId }).first();
    if (!disposal) return res.status(404).json({ error: 'Disposal not found' });
    res.json({ data: disposal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cgt/:id/status  — Update payment status
router.put('/:id/status', requireRole('owner', 'accountant'), auditLog('cgt_disposal'), async (req, res) => {
  try {
    const { status, payment_date } = req.body;
    if (!['computed', 'filed', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const [updated] = await db('cgt_disposals')
      .where({ id: req.params.id, company_id: req.user.companyId })
      .update({ status, payment_date: payment_date || null, updated_at: new Date() })
      .returning('*');
    if (!updated) return res.status(404).json({ error: 'Disposal not found' });
    res.json({ message: 'Status updated', data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cgt/summary/:year  — Annual CGT summary for a given YA
router.get('/summary/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const disposals = await db('cgt_disposals')
      .where({ company_id: req.user.companyId })
      .whereRaw('EXTRACT(YEAR FROM disposal_date) = ?', [year])
      .orderBy('disposal_date');
    const totalGain = disposals.reduce((s, d) => s + parseFloat(d.gross_gain || 0), 0);
    const totalCGT  = disposals.reduce((s, d) => s + parseFloat(d.cgt_payable || 0), 0);
    const exemptDisposals = disposals.filter(d => d.is_listed);
    res.json({
      data: {
        year,
        total_disposals:         disposals.length,
        taxable_disposals:       disposals.filter(d => !d.is_listed).length,
        exempt_disposals:        exemptDisposals.length,
        total_gain:              totalGain,
        total_cgt_payable:       totalCGT,
        disposals,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cgt/audit-log  — Read audit trail (owners only)
router.get('/meta/audit-log', requireRole('owner'), async (req, res) => {
  try {
    const { limit = 50, entity_type } = req.query;
    const query = db('audit_log')
      .where({ company_id: req.user.companyId })
      .orderBy('created_at', 'desc')
      .limit(Math.min(parseInt(limit), 200));
    if (entity_type) query.where({ entity_type });
    const logs = await query;
    res.json({ data: logs, total: logs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
