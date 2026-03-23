const express = require('express');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const cid = (req) => req.user.companyId;

// GET /api/reports/trial-balance?date=YYYY-MM-DD
router.get('/trial-balance', async (req, res) => {
  try {
    const { date } = req.query;
    const dateFilter = date || new Date().toISOString().split('T')[0];

    const rows = await db('journal_lines as jl')
      .join('journal_entries as je', 'jl.journal_entry_id', 'je.id')
      .join('accounts as a', 'jl.account_id', 'a.id')
      .where('je.company_id', cid(req))
      .where('je.status', 'posted')
      .where('je.entry_date', '<=', dateFilter)
      .groupBy('a.id', 'a.account_code', 'a.account_name', 'a.account_type')
      .select(
        'a.account_code', 'a.account_name', 'a.account_type',
        db.raw('SUM(jl.debit) as total_debit'),
        db.raw('SUM(jl.credit) as total_credit'),
        db.raw('SUM(jl.debit) - SUM(jl.credit) as balance')
      )
      .orderBy('a.account_code');

    const totalDebit = rows.reduce((s, r) => s + parseFloat(r.total_debit || 0), 0);
    const totalCredit = rows.reduce((s, r) => s + parseFloat(r.total_credit || 0), 0);

    res.json({
      data: {
        as_of_date: dateFilter,
        accounts: rows,
        totals: { total_debit: totalDebit, total_credit: totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/profit-loss?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/profit-loss', async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from || `${new Date().getFullYear()}-01-01`;
    const toDate = to || new Date().toISOString().split('T')[0];

    const rows = await db('journal_lines as jl')
      .join('journal_entries as je', 'jl.journal_entry_id', 'je.id')
      .join('accounts as a', 'jl.account_id', 'a.id')
      .where('je.company_id', cid(req))
      .where('je.status', 'posted')
      .whereBetween('je.entry_date', [fromDate, toDate])
      .whereIn('a.account_type', ['revenue', 'expense'])
      .groupBy('a.id', 'a.account_code', 'a.account_name', 'a.account_type')
      .select(
        'a.account_code', 'a.account_name', 'a.account_type',
        db.raw('SUM(jl.credit) - SUM(jl.debit) as net_amount')
      )
      .orderBy('a.account_type', 'a.account_code');

    const revenue = rows.filter((r) => r.account_type === 'revenue');
    const expenses = rows.filter((r) => r.account_type === 'expense');

    const totalRevenue = revenue.reduce((s, r) => s + parseFloat(r.net_amount || 0), 0);
    const totalExpenses = expenses.reduce((s, r) => s + parseFloat(r.net_amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    res.json({
      data: {
        period: { from: fromDate, to: toDate },
        revenue: { items: revenue, total: totalRevenue },
        expenses: { items: expenses.map((e) => ({ ...e, net_amount: -parseFloat(e.net_amount) })), total: -totalExpenses },
        net_profit: netProfit,
        is_profitable: netProfit >= 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/balance-sheet?date=YYYY-MM-DD
router.get('/balance-sheet', async (req, res) => {
  try {
    const { date } = req.query;
    const asOfDate = date || new Date().toISOString().split('T')[0];

    const rows = await db('journal_lines as jl')
      .join('journal_entries as je', 'jl.journal_entry_id', 'je.id')
      .join('accounts as a', 'jl.account_id', 'a.id')
      .where('je.company_id', cid(req))
      .where('je.status', 'posted')
      .where('je.entry_date', '<=', asOfDate)
      .whereIn('a.account_type', ['asset', 'liability', 'equity'])
      .groupBy('a.id', 'a.account_code', 'a.account_name', 'a.account_type')
      .select(
        'a.account_code', 'a.account_name', 'a.account_type',
        db.raw('SUM(jl.debit) - SUM(jl.credit) as balance')
      )
      .orderBy('a.account_type', 'a.account_code');

    const assets = rows.filter((r) => r.account_type === 'asset');
    const liabilities = rows.filter((r) => r.account_type === 'liability');
    const equity = rows.filter((r) => r.account_type === 'equity');

    const totalAssets = assets.reduce((s, r) => s + parseFloat(r.balance || 0), 0);
    const totalLiabilities = liabilities.reduce((s, r) => s + Math.abs(parseFloat(r.balance || 0)), 0);
    const totalEquity = equity.reduce((s, r) => s + Math.abs(parseFloat(r.balance || 0)), 0);

    res.json({
      data: {
        as_of_date: asOfDate,
        assets: { items: assets, total: totalAssets },
        liabilities: { items: liabilities, total: totalLiabilities },
        equity: { items: equity, total: totalEquity },
        balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/dashboard
router.get(['/dashboard', '/dashboard-summary'], async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const fromDate = `${currentYear}-01-01`;
    const toDate = new Date().toISOString().split('T')[0];

    // Revenue YTD
    const revenueRows = await db('journal_lines as jl')
      .join('journal_entries as je', 'jl.journal_entry_id', 'je.id')
      .join('accounts as a', 'jl.account_id', 'a.id')
      .where('je.company_id', cid(req)).where('je.status', 'posted')
      .where('a.account_type', 'revenue').whereBetween('je.entry_date', [fromDate, toDate])
      .select(db.raw('SUM(jl.credit) - SUM(jl.debit) as total')).first();

    // Expense YTD
    const expenseRows = await db('journal_lines as jl')
      .join('journal_entries as je', 'jl.journal_entry_id', 'je.id')
      .join('accounts as a', 'jl.account_id', 'a.id')
      .where('je.company_id', cid(req)).where('je.status', 'posted')
      .where('a.account_type', 'expense').whereBetween('je.entry_date', [fromDate, toDate])
      .select(db.raw('SUM(jl.debit) - SUM(jl.credit) as total')).first();

    // Invoices (open)
    const openInvoices = await db('invoices')
      .where({ company_id: cid(req) })
      .whereIn('status', ['sent', 'overdue'])
      .select(db.raw('COUNT(*) as count'), db.raw('SUM(total_amount) as total')).first();

    // Tax payable from last computation
    const taxComp = await db('tax_computations')
      .where({ company_id: cid(req) })
      .orderBy('year_of_assessment', 'desc')
      .first();

    const revenue = parseFloat(revenueRows?.total || 0);
    const expenses = parseFloat(expenseRows?.total || 0);

    res.json({
      data: {
        period: { from: fromDate, to: toDate },
        revenue_ytd: revenue,
        expenses_ytd: expenses,
        net_profit_ytd: revenue - expenses,
        open_invoices_count: parseInt(openInvoices?.count || 0),
        open_invoices_amount: parseFloat(openInvoices?.total || 0),
        estimated_tax_payable: taxComp?.balance_tax_payable || 0,
        last_tax_year: taxComp?.year_of_assessment || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
