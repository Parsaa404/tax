const express = require('express');
const Joi = require('joi');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const taxService = require('../services/taxService');

const router = express.Router();
router.use(authenticate);

// POST /api/tax/compute - Run full tax computation for a year
router.post('/compute', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const schema = Joi.object({
      year_of_assessment: Joi.number().integer().min(2000).max(2100).required(),
      gross_revenue: Joi.number().min(0).required(),
      total_allowable_expenses: Joi.number().min(0).required(),
      total_capital_allowance: Joi.number().min(0).default(0),
      losses_brought_forward: Joi.number().min(0).default(0),
      zakat_paid: Joi.number().min(0).default(0),
      cp204_paid: Joi.number().min(0).default(0),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const company = await db('companies').where({ id: req.user.companyId }).first();

    const result = taxService.computeFullTax({
      ...value,
      is_sme: company.is_sme,
      is_part_of_large_group: company.is_part_of_large_group,
    });

    // Upsert computation
    const existing = await db('tax_computations')
      .where({ company_id: req.user.companyId, year_of_assessment: value.year_of_assessment })
      .first();

    const compData = {
      company_id: req.user.companyId,
      year_of_assessment: value.year_of_assessment,
      gross_revenue: result.gross_revenue,
      total_income: result.gross_revenue,
      total_allowable_expenses: result.total_allowable_expenses,
      adjusted_income: result.adjusted_income,
      total_capital_allowance: result.total_capital_allowance,
      statutory_income: result.statutory_income,
      losses_brought_forward: result.losses_brought_forward,
      chargeable_income: result.chargeable_income,
      is_sme: company.is_sme,
      tax_on_first_band: result.tax_on_first_band,
      tax_on_second_band: result.tax_on_second_band,
      tax_on_remainder: result.tax_on_remainder,
      tax_before_rebates: result.tax_before_rebates,
      zakat_offset: result.zakat_offset,
      tax_after_rebates: result.tax_after_rebates,
      cp204_paid: result.cp204_paid,
      balance_tax_payable: result.balance_tax_payable,
      computation_details: result,
    };

    let computation;
    if (existing) {
      [computation] = await db('tax_computations')
        .where({ id: existing.id })
        .update({ ...compData, updated_at: new Date() })
        .returning('*');
    } else {
      [computation] = await db('tax_computations').insert(compData).returning('*');
    }

    res.json({ message: 'Tax computation complete', data: computation });
  } catch (err) {
    console.error('Tax compute error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tax/computation/:year
router.get('/computation/:year', async (req, res) => {
  try {
    const computation = await db('tax_computations')
      .where({ company_id: req.user.companyId, year_of_assessment: req.params.year })
      .first();
    if (!computation) return res.status(404).json({ error: 'No computation found for this year' });
    res.json({ data: computation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tax/computations - list all years
router.get('/computations', async (req, res) => {
  try {
    const computations = await db('tax_computations')
      .where({ company_id: req.user.companyId })
      .orderBy('year_of_assessment', 'desc');
    res.json({ data: computations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tax/calculate/cit - quick CIT calculator
router.post('/calculate/cit', async (req, res) => {
  try {
    const { chargeable_income, is_sme = true, is_part_of_large_group = false } = req.body;
    if (!chargeable_income) return res.status(400).json({ error: 'chargeable_income is required' });
    const result = taxService.calculateCIT(parseFloat(chargeable_income), is_sme, is_part_of_large_group);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tax/calculate/sst
router.post('/calculate/sst', async (req, res) => {
  try {
    const { amount, type } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount is required' });
    const result = taxService.calculateSST(parseFloat(amount), type);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tax/calculate/withholding
router.post('/calculate/withholding', async (req, res) => {
  try {
    const { amount, type } = req.body;
    if (!amount || !type) return res.status(400).json({ error: 'amount and type are required' });
    const result = taxService.calculateWithholdingTax(parseFloat(amount), type);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tax/calculate/capital-allowance
router.post('/calculate/capital-allowance', async (req, res) => {
  try {
    const { cost, acquisition_date, category, year_of_assessment } = req.body;
    if (!cost || !acquisition_date || !category) {
      return res.status(400).json({ error: 'cost, acquisition_date, category are required' });
    }
    const result = taxService.calculateCapitalAllowance({
      cost: parseFloat(cost),
      acquisition_date,
      category,
      year_of_assessment: year_of_assessment || new Date().getFullYear(),
    });
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tax/calculate/cgt  — Capital Gains Tax on unlisted shares (CGTA 2023)
router.post('/calculate/cgt', async (req, res) => {
  try {
    const { consideration_received, acquisition_cost, is_listed = false } = req.body;
    if (consideration_received == null || acquisition_cost == null) {
      return res.status(400).json({ error: 'consideration_received and acquisition_cost are required' });
    }
    const result = taxService.calculateCGT(
      parseFloat(consideration_received),
      parseFloat(acquisition_cost),
      !!is_listed
    );
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tax/calculate/gmt  — Global Minimum Tax (Pillar Two) assessment
router.post('/calculate/gmt', async (req, res) => {
  try {
    const { effective_tax_rate, jurisdictional_profit, is_mne = false } = req.body;
    if (effective_tax_rate == null) {
      return res.status(400).json({ error: 'effective_tax_rate is required' });
    }
    const result = taxService.assessGMT(
      parseFloat(effective_tax_rate),
      parseFloat(jurisdictional_profit || 0),
      !!is_mne
    );
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

