const express = require('express');
const axios = require('axios');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// POST /api/ai/categorize - categorize a transaction description
router.post('/categorize', async (req, res) => {
  try {
    const { description, amount } = req.body;
    if (!description) return res.status(400).json({ error: 'description is required' });

    // Try AI service first, fallback to rule-based
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/categorize`, { description, amount }, { timeout: 3000 });
      return res.json({ data: response.data });
    } catch (aiErr) {
      // Fallback: rule-based categorization
      const result = ruleBasedCategorize(description, amount);
      return res.json({ data: result, source: 'rule_based_fallback' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/optimize - get tax optimization suggestions
router.post('/optimize', async (req, res) => {
  try {
    const { year_of_assessment } = req.body;
    const year = year_of_assessment || new Date().getFullYear();

    // Get company financials
    const [company, expenses, assets, taxComp] = await Promise.all([
      db('companies').where({ id: req.user.companyId }).first(),
      db('expenses').where({ company_id: req.user.companyId }).where(db.raw('EXTRACT(YEAR FROM expense_date) = ?', [year])),
      db('fixed_assets').where({ company_id: req.user.companyId, status: 'active' }),
      db('tax_computations').where({ company_id: req.user.companyId, year_of_assessment: year }).first(),
    ]);

    try {
      const response = await axios.post(`${AI_SERVICE_URL}/optimize`, {
        company, expenses, assets, tax_computation: taxComp, year,
      }, { timeout: 5000 });
      return res.json({ data: response.data });
    } catch (aiErr) {
      // Fallback: built-in suggestions
      const suggestions = generateOptimizationSuggestions(company, expenses, assets, taxComp);
      return res.json({ data: suggestions, source: 'rule_based_fallback' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/predict - predict next year's tax
router.post('/predict', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const computations = await db('tax_computations')
      .where({ company_id: req.user.companyId })
      .orderBy('year_of_assessment', 'asc')
      .limit(3);

    if (computations.length === 0) {
      return res.json({ data: { message: 'No historical data for prediction. Run tax computation first.' } });
    }

    // Simple linear trend prediction
    const latestYear = computations[computations.length - 1];
    const growthRate = computations.length > 1
      ? (latestYear.gross_revenue - computations[0].gross_revenue) / computations[0].gross_revenue / computations.length
      : 0.10; // assume 10% growth if only one data point

    const predictedRevenue = latestYear.gross_revenue * (1 + growthRate);
    const predictedExpenses = latestYear.total_allowable_expenses * (1 + growthRate * 0.8);
    const predictedChargeable = Math.max(predictedRevenue - predictedExpenses - latestYear.total_capital_allowance, 0);

    const { default: taxService } = await Promise.resolve({ default: require('../services/taxService') });
    const citPredict = require('../services/taxService').calculateCIT(predictedChargeable, latestYear.is_sme);

    res.json({
      data: {
        prediction_year: currentYear + 1,
        based_on_years: computations.map((c) => c.year_of_assessment),
        predicted_revenue: predictedRevenue,
        predicted_expenses: predictedExpenses,
        predicted_chargeable_income: predictedChargeable,
        predicted_tax: citPredict.total_tax,
        predicted_effective_rate: citPredict.effective_rate,
        growth_rate_assumed: growthRate,
        note: 'Prediction based on linear trend. Actual may vary.',
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rule-based transaction categorization (fallback)
function ruleBasedCategorize(description, amount) {
  const desc = description.toLowerCase();
  const categories = [
    { keywords: ['salary', 'payroll', 'wages', 'gaji'], category: 'salaries', type: 'expense', deductible: true },
    { keywords: ['rent', 'sewa', 'rental'], category: 'rent', type: 'expense', deductible: true },
    { keywords: ['electric', 'water', 'utilities', 'telco', 'internet'], category: 'utilities', type: 'expense', deductible: true },
    { keywords: ['advertising', 'marketing', 'ads', 'promo'], category: 'marketing', type: 'expense', deductible: true },
    { keywords: ['audit', 'legal', 'lawyer', 'accountant', 'consultant'], category: 'professional_fees', type: 'expense', deductible: true },
    { keywords: ['travel', 'flight', 'hotel', 'accommodation', 'petrol'], category: 'travel', type: 'expense', deductible: true },
    { keywords: ['entertainment', 'dining', 'restaurant', 'makan'], category: 'entertainment', type: 'expense', deductible: true, max_rate: 50 },
    { keywords: ['insurance', 'insuran'], category: 'insurance', type: 'expense', deductible: true },
    { keywords: ['computer', 'laptop', 'server', 'software'], category: 'computers', type: 'asset', deductible: true, aca: true },
    { keywords: ['car', 'vehicle', 'van', 'truck'], category: 'motor_vehicles', type: 'asset', deductible: true },
    { keywords: ['sales', 'revenue', 'income', 'service charge'], category: 'revenue', type: 'income', deductible: false },
  ];

  for (const cat of categories) {
    if (cat.keywords.some((kw) => desc.includes(kw))) {
      return {
        category: cat.category,
        transaction_type: cat.type,
        is_tax_deductible: cat.deductible,
        deductible_rate: cat.max_rate || 100,
        is_aca_eligible: cat.aca || false,
        confidence: 0.85,
        matched_keywords: cat.keywords.filter((kw) => desc.includes(kw)),
      };
    }
  }

  return {
    category: 'other',
    transaction_type: 'expense',
    is_tax_deductible: true,
    deductible_rate: 100,
    confidence: 0.30,
    note: 'Low confidence - please review manually',
  };
}

// Built-in tax optimization suggestions
function generateOptimizationSuggestions(company, expenses, assets, taxComp) {
  const suggestions = [];

  if (company?.is_sme) {
    suggestions.push({
      type: 'sme_incentive',
      title: 'SME Tiered Tax Rate',
      description: 'As an SME, you benefit from 15% rate on first RM150,000 and 17% on next RM450,000.',
      potential_saving: null,
      section_reference: 'Schedule 1, ITA 1967',
      priority: 'info',
    });
  }

  // Check computer assets for ACA
  const noComputerACA = assets.filter((a) => a.asset_category === 'computers' && !a.total_ca_claimed);
  if (noComputerACA.length > 0) {
    const value = noComputerACA.reduce((s, a) => s + parseFloat(a.cost), 0);
    suggestions.push({
      type: 'aca_computers',
      title: 'Accelerated Capital Allowance - Computers',
      description: `You have ${noComputerACA.length} computer asset(s) worth RM${value.toFixed(2)} eligible for 100% ACA write-off in Year 1.`,
      potential_saving: value * 0.17,
      section_reference: 'Schedule 3, ITA 1967 - ACA for ICT Equipment',
      priority: 'high',
    });
  }

  // R&D expenses
  const rdExpenses = expenses.filter((e) => e.category === 'research_development');
  if (rdExpenses.length > 0) {
    const rdAmount = rdExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    suggestions.push({
      type: 'rd_deduction',
      title: 'R&D Double Deduction (Section 34A)',
      description: `Qualify R&D expenses of RM${rdAmount.toFixed(2)} for double deduction under Section 34A if approved by MOSTI.`,
      potential_saving: rdAmount * 0.17,
      section_reference: 'Section 34A, ITA 1967',
      priority: 'medium',
    });
  }

  // Training expenses
  const trainingExpenses = expenses.filter((e) => e.category === 'training');
  if (trainingExpenses.length > 0) {
    suggestions.push({
      type: 'training_deduction',
      title: 'Training & Human Capital Development',
      description: 'Training expenses are 100% deductible under Section 33. Ensure all training receipts are maintained.',
      potential_saving: null,
      section_reference: 'Section 33, ITA 1967',
      priority: 'medium',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({ type: 'general', title: 'No major optimizations found', description: 'Add transactions and assets for more tailored suggestions.', priority: 'info' });
  }

  return { year: new Date().getFullYear(), suggestions, disclaimer: 'These are general suggestions. Consult a tax advisor for specific advice.' };
}

module.exports = router;
