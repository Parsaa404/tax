const express = require('express');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const taxService = require('../services/taxService');

const router = express.Router();
router.use(authenticate);

// GET /api/assets
router.get('/', async (req, res) => {
  try {
    const assets = await db('fixed_assets')
      .where({ company_id: req.user.companyId })
      .orderBy('acquisition_date', 'desc');
    res.json({ data: assets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assets
router.post('/', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const { asset_name, asset_category, acquisition_date, cost, residual_value, useful_life_years } = req.body;
    if (!asset_name || !asset_category || !acquisition_date || !cost) {
      return res.status(400).json({ error: 'asset_name, asset_category, acquisition_date, cost required' });
    }

    // Determine CA rates from constants
    const caRates = {
      plant_machinery: { ia: 0.20, aa: 0.20 },
      motor_vehicles: { ia: 0.20, aa: 0.20 },
      office_equipment: { ia: 0.20, aa: 0.20 },
      furniture: { ia: 0.20, aa: 0.10 },
      computers: { ia: 0.00, aa: 0.80 }, // ACA
      building: { ia: 0.10, aa: 0.03 },
      other: { ia: 0.20, aa: 0.10 },
    };
    const rates = caRates[asset_category] || caRates['other'];
    const book_value = parseFloat(cost) - (residual_value || 0);

    const [asset] = await db('fixed_assets').insert({
      company_id: req.user.companyId,
      asset_name, asset_category, acquisition_date,
      cost: parseFloat(cost),
      residual_value: parseFloat(residual_value || 0),
      useful_life_years,
      initial_allowance_rate: rates.ia * 100,
      annual_allowance_rate: rates.aa * 100,
      residual_expenditure: parseFloat(cost),
      book_value,
      status: 'active',
    }).returning('*');

    res.status(201).json({ message: 'Asset created', data: asset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assets/:id/capital-allowance/:year
router.get('/:id/capital-allowance/:year', async (req, res) => {
  try {
    const asset = await db('fixed_assets')
      .where({ id: req.params.id, company_id: req.user.companyId }).first();
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const ca = taxService.calculateCapitalAllowance({
      cost: parseFloat(asset.cost),
      acquisition_date: asset.acquisition_date,
      category: asset.asset_category,
      year_of_assessment: parseInt(req.params.year),
    });

    res.json({ data: { asset, capital_allowance: ca } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
