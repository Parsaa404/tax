/**
 * Phase 7 — Data Export Routes
 * CSV export for transactions, expenses, payroll, and CGT disposals.
 * Form C worksheet and CP204 12-instalment wizard.
 */
const express = require('express');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const taxService = require('../services/taxService');

const router = express.Router();
router.use(authenticate);

// Helper: convert array of objects to CSV string
function toCSV(rows, columns) {
  if (!rows || rows.length === 0) return columns.join(',') + '\n(no data)\n';
  const header = columns.join(',');
  const lines = rows.map(r =>
    columns.map(c => {
      const v = r[c] == null ? '' : String(r[c]);
      return v.includes(',') || v.includes('"') || v.includes('\n')
        ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',')
  );
  return [header, ...lines].join('\n');
}

// GET /api/export/transactions?from=&to=
router.get('/transactions', async (req, res) => {
  try {
    const { from, to } = req.query;
    const query = db('journal_entries as je')
      .join('journal_lines as jl', 'jl.journal_entry_id', 'je.id')
      .join('accounts as a', 'a.id', 'jl.account_id')
      .where('je.company_id', req.user.companyId)
      .select(
        'je.entry_date as transaction_date', 'je.reference', 'je.narration as description',
        'a.account_code', 'a.account_name',
        'jl.debit as debit_amount', 'jl.credit as credit_amount'
      )
      .orderBy('je.entry_date', 'desc');
    if (from) query.where('je.entry_date', '>=', from);
    if (to)   query.where('je.entry_date', '<=', to);
    const rows = await query;
    const csv = toCSV(rows, ['transaction_date','reference','description','account_code','account_name','debit_amount','credit_amount']);


    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/export/expenses?from=&to=
router.get('/expenses', async (req, res) => {
  try {
    const { from, to } = req.query;
    const query = db('expenses').where({ company_id: req.user.companyId }).orderBy('expense_date','desc');
    if (from) query.where('expense_date', '>=', from);
    if (to)   query.where('expense_date', '<=', to);
    const rows = await query;
    const csv = toCSV(rows, ['expense_date','description','vendor_name','category','amount','is_tax_deductible','status','receipt_number']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/export/payroll?run_id=
router.get('/payroll', async (req, res) => {
  try {
    const { run_id } = req.query;
    const query = db('payroll_items as pi')
      .join('payroll_runs as pr', 'pr.id', 'pi.payroll_run_id')
      .join('employees as e', 'e.id', 'pi.employee_id')
      .where('pr.company_id', req.user.companyId)
      .select(
        'pr.payroll_month', 'pr.payroll_year',
        'e.full_name', 'e.ic_number', 'e.epf_number',
        'pi.gross_salary', 'pi.epf_employee', 'pi.socso_employee',
        'pi.eis_employee', 'pi.pcb_amount', 'pi.zakat_amount',
        'pi.total_deductions', 'pi.net_salary',
        'pi.epf_employer', 'pi.socso_employer', 'pi.eis_employer', 'pi.employer_total_cost'
      )
      .orderBy(['pr.payroll_year', 'pr.payroll_month', 'e.full_name']);
    if (run_id) query.where('pi.payroll_run_id', run_id);
    const rows = await query;
    const csv = toCSV(rows, [
      'payroll_month','payroll_year','full_name','ic_number','epf_number',
      'gross_salary','epf_employee','socso_employee','eis_employee','pcb_amount',
      'zakat_amount','total_deductions','net_salary',
      'epf_employer','socso_employer','eis_employer','employer_total_cost'
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payroll.csv"');
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/export/cgt
router.get('/cgt', async (req, res) => {
  try {
    const rows = await db('cgt_disposals').where({ company_id: req.user.companyId }).orderBy('disposal_date','desc');
    const csv = toCSV(rows, ['disposal_date','share_name','company_reg_no','is_listed','acquisition_cost','consideration_received','incidental_costs_disposal','gross_gain','cgt_rate','cgt_payable','status','payment_due_date']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="cgt_disposals.csv"');
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/export/form-c-worksheet — Form C data worksheet for filing
router.post('/form-c-worksheet', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const { year_of_assessment } = req.body;
    if (!year_of_assessment) return res.status(400).json({ error: 'year_of_assessment is required' });

    const company = await db('companies').where({ id: req.user.companyId }).first();
    const computation = await db('tax_computations')
      .where({ company_id: req.user.companyId, year_of_assessment }).first();
    const cgtSummary = await db('cgt_disposals')
      .where({ company_id: req.user.companyId })
      .whereRaw('EXTRACT(YEAR FROM disposal_date) = ?', [year_of_assessment]);
    const totalCGT = cgtSummary.reduce((s, d) => s + parseFloat(d.cgt_payable || 0), 0);

    res.json({
      message: 'Form C Worksheet',
      data: {
        company: {
          name:                company.name,
          registration_number: company.registration_number,
          tax_number:          company.tax_number,
          is_sme:              company.is_sme,
          financial_year_end:  company.financial_year_end,
        },
        year_of_assessment,
        income_statement:   computation || null,
        cgt_summary: {
          total_disposals:  cgtSummary.length,
          total_cgt_due:    totalCGT,
          disposals:        cgtSummary,
        },
        filing_deadline: `7 months after financial year ending ${company.financial_year_end}/${year_of_assessment}`,
        instructions: [
          'Complete Form C via MyTax portal (mytax.hasil.gov.my)',
          'Attach audited financial statements',
          'Declare all CGT disposals in Section B of Form CKHT 2A',
          'Ensure CP204 instalments match actual payments',
          'Submit within 7 months of financial year end (Section 77A, ITA 1967)',
        ],
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/export/cp204-wizard — 12-instalment plan calculator
router.post('/cp204-wizard', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const { estimated_chargeable_income, financial_year_end_month, financial_year_start } = req.body;
    if (!estimated_chargeable_income) return res.status(400).json({ error: 'estimated_chargeable_income is required' });

    const company = await db('companies').where({ id: req.user.companyId }).first();
    const cit = taxService.calculateCIT(
      parseFloat(estimated_chargeable_income),
      company.is_sme,
      false
    );

    const fyeMonth  = financial_year_end_month || company.financial_year_end || 12;
    const startDate = financial_year_start ? new Date(financial_year_start) : new Date();
    const instalmentAmount = Math.ceil(cit.total_tax / 12);

    // Generate 12 instalments starting from 2nd month of FY
    const instalments = Array.from({ length: 12 }, (_, i) => {
      const due = new Date(startDate);
      due.setMonth(due.getMonth() + i + 1);
      due.setDate(10); // 10th of each month
      return {
        instalment:  i + 1,
        due_date:    due.toISOString().slice(0, 10),
        amount:      instalmentAmount,
        cumulative:  instalmentAmount * (i + 1),
      };
    });

    res.json({
      message: 'CP204 Instalment Plan',
      data: {
        company_name:               company.name,
        is_sme:                     company.is_sme,
        estimated_chargeable_income: parseFloat(estimated_chargeable_income),
        estimated_tax:              cit.total_tax,
        effective_rate:             `${(cit.effective_rate * 100).toFixed(2)}%`,
        monthly_instalment:         instalmentAmount,
        instalments,
        important_notes: [
          'Submit CP204 30 days before start of new financial year',
          'Pay each instalment by the 10th of the month',
          'Variance > 30% attracts 10% penalty on shortfall (Section 107C)',
          'Revise estimate via CP204A if mid-year profit differs significantly',
        ],
        tax_breakdown: cit.breakdown,
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
