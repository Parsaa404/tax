const express = require('express');
const Joi = require('joi');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');

const router = express.Router();
router.use(authenticate);

const transactionSchema = Joi.object({
  transaction_type: Joi.string().valid(
    'invoice', 'expense', 'payroll', 'asset_purchase', 'journal', 'receipt', 'payment', 'transfer'
  ).required(),
  transaction_date: Joi.date().required(),
  description: Joi.string().required(),
  currency: Joi.string().length(3).default('MYR'),
  exchange_rate: Joi.number().positive().default(1),
  reference_id: Joi.string().uuid().allow(null),
  reference_type: Joi.string().allow(null),
  journal_lines: Joi.array().items(
    Joi.object({
      account_id: Joi.string().uuid().required(),
      debit: Joi.number().min(0).default(0),
      credit: Joi.number().min(0).default(0),
      description: Joi.string().allow('', null),
    })
  ).min(2).required(),
});

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const { type, from_date, to_date, status, page = 1, limit = 50 } = req.query;
    let query = db('transactions')
      .where({ company_id: req.user.companyId })
      .orderBy('transaction_date', 'desc');

    if (type) query = query.where({ transaction_type: type });
    if (from_date) query = query.where('transaction_date', '>=', from_date);
    if (to_date) query = query.where('transaction_date', '<=', to_date);
    if (status) query = query.where({ status });

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [total, transactions] = await Promise.all([
      db('transactions').where({ company_id: req.user.companyId }).count('id as count').first(),
      query.limit(parseInt(limit)).offset(offset),
    ]);

    res.json({
      data: transactions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total.count) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions/:id (with journal lines)
router.get('/:id', async (req, res) => {
  try {
    const transaction = await db('transactions')
      .where({ id: req.params.id, company_id: req.user.companyId })
      .first();
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    const journalEntry = await db('journal_entries')
      .where({ transaction_id: transaction.id })
      .first();

    let journalLines = [];
    if (journalEntry) {
      journalLines = await db('journal_lines as jl')
        .join('accounts as a', 'jl.account_id', 'a.id')
        .where('jl.journal_entry_id', journalEntry.id)
        .select('jl.*', 'a.account_code', 'a.account_name', 'a.account_type')
        .orderBy('jl.line_number');
    }

    res.json({ data: { ...transaction, journal_entry: journalEntry, journal_lines: journalLines } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions - create with auto double-entry journal
router.post('/', requireRole('owner', 'accountant'), auditLog('transaction'), async (req, res) => {
  try {
    const { error, value } = transactionSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { journal_lines: lines, ...txData } = value;

    // Validate double-entry: sum of debits must equal sum of credits
    const totalDebit = lines.reduce((s, l) => s + parseFloat(l.debit || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + parseFloat(l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        error: 'Double-entry violation: Total debits must equal total credits',
        totalDebit,
        totalCredit,
        difference: Math.abs(totalDebit - totalCredit),
      });
    }

    // Validate all accounts belong to this company
    const accountIds = lines.map((l) => l.account_id);
    const accounts = await db('accounts')
      .whereIn('id', accountIds)
      .where({ company_id: req.user.companyId });
    if (accounts.length !== accountIds.length) {
      return res.status(400).json({ error: 'One or more accounts not found or not accessible' });
    }

    const result = await db.transaction(async (trx) => {
      const [transaction] = await trx('transactions').insert({
        ...txData,
        company_id: req.user.companyId,
        amount: totalDebit,
        status: 'posted',
        created_by: req.user.userId,
      }).returning('*');

      const [journalEntry] = await trx('journal_entries').insert({
        company_id: req.user.companyId,
        transaction_id: transaction.id,
        entry_date: txData.transaction_date,
        narration: txData.description,
        status: 'posted',
        created_by: req.user.userId,
      }).returning('*');

      const journalLineInserts = lines.map((line, idx) => ({
        journal_entry_id: journalEntry.id,
        account_id: line.account_id,
        debit: parseFloat(line.debit || 0),
        credit: parseFloat(line.credit || 0),
        description: line.description || txData.description,
        line_number: idx + 1,
      }));

      await trx('journal_lines').insert(journalLineInserts);

      return { transaction, journalEntry };
    });

    res.status(201).json({ message: 'Transaction posted', data: result.transaction });
  } catch (err) {
    console.error('Transaction error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/transactions/:id (void - not delete)
router.delete('/:id', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const transaction = await db('transactions')
      .where({ id: req.params.id, company_id: req.user.companyId })
      .first();
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    if (transaction.status === 'void') return res.status(409).json({ error: 'Transaction already voided' });

    await db('transactions').where({ id: req.params.id }).update({ status: 'void' });
    await db('journal_entries').where({ transaction_id: req.params.id }).update({ status: 'void' });

    res.json({ message: 'Transaction voided' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
