const express = require('express');
const Joi = require('joi');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const payrollService = require('../services/payrollService');

const router = express.Router();
router.use(authenticate);

// POST /api/payroll/preview - calculate without saving
router.post('/preview', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const { employee_id, bonus = 0, allowances = 0, overtime = 0 } = req.body;

    const employee = await db('employees')
      .where({ id: employee_id, company_id: req.user.companyId, status: 'active' })
      .first();
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const result = payrollService.calculateEmployeePayroll(employee, { bonus, allowances, overtime });
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payroll/run - execute payroll for all active employees
router.post('/run', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const schema = Joi.object({
      year: Joi.number().integer().required(),
      month: Joi.number().integer().min(1).max(12).required(),
      overrides: Joi.array().items(Joi.object({
        employee_id: Joi.string().uuid().required(),
        bonus: Joi.number().min(0).default(0),
        allowances: Joi.number().min(0).default(0),
        overtime: Joi.number().min(0).default(0),
        other_deductions: Joi.number().min(0).default(0),
      })).default([]),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { year, month, overrides } = value;

    // Check for existing run
    const existingRun = await db('payroll_runs')
      .where({ company_id: req.user.companyId, year, month })
      .whereNot({ status: 'void' }).first();
    if (existingRun) {
      return res.status(409).json({ error: `Payroll already run for ${year}-${month}`, data: existingRun });
    }

    const employees = await db('employees')
      .where({ company_id: req.user.companyId, status: 'active' });

    if (employees.length === 0) {
      return res.status(400).json({ error: 'No active employees found' });
    }

    const result = await db.transaction(async (trx) => {
      // Create payroll run
      const [run] = await trx('payroll_runs').insert({
        company_id: req.user.companyId,
        year, month,
        run_reference: `PR-${year}-${String(month).padStart(2, '0')}`,
        created_by: req.user.userId,
        status: 'draft',
      }).returning('*');

      // Calculate each employee
      const items = [];
      const totals = {
        total_gross: 0, total_epf_employee: 0, total_epf_employer: 0,
        total_socso_employee: 0, total_socso_employer: 0,
        total_eis_employee: 0, total_eis_employer: 0,
        total_pcb: 0, total_zakat: 0, total_net: 0, total_employer_cost: 0,
      };

      for (const emp of employees) {
        const override = overrides.find((o) => o.employee_id === emp.id) || {};
        const calc = payrollService.calculateEmployeePayroll(emp, override);

        items.push({
          payroll_run_id: run.id,
          employee_id: emp.id,
          basic_salary: calc.basic_salary,
          allowances: calc.allowances,
          overtime: calc.overtime,
          bonus: calc.bonus,
          gross_salary: calc.gross_salary,
          epf_employee: calc.epf_employee,
          epf_employer: calc.epf_employer,
          socso_employee: calc.socso_employee,
          socso_employer: calc.socso_employer,
          eis_employee: calc.eis_employee,
          eis_employer: calc.eis_employer,
          pcb: calc.pcb,
          zakat: calc.zakat,
          other_deductions: calc.other_deductions,
          net_salary: calc.net_salary,
          employer_cost: calc.employer_cost,
          calculation_details: calc.calculation_details,
        });

        totals.total_gross += calc.gross_salary;
        totals.total_epf_employee += calc.epf_employee;
        totals.total_epf_employer += calc.epf_employer;
        totals.total_socso_employee += calc.socso_employee;
        totals.total_socso_employer += calc.socso_employer;
        totals.total_eis_employee += calc.eis_employee;
        totals.total_eis_employer += calc.eis_employer;
        totals.total_pcb += calc.pcb;
        totals.total_zakat += calc.zakat;
        totals.total_net += calc.net_salary;
        totals.total_employer_cost += calc.employer_cost;
      }

      await trx('payroll_items').insert(items);

      // Update run with totals
      const [updatedRun] = await trx('payroll_runs')
        .where({ id: run.id })
        .update({ ...totals, updated_at: new Date() })
        .returning('*');

      return updatedRun;
    });

    res.status(201).json({ message: 'Payroll run complete', data: result });
  } catch (err) {
    console.error('Payroll run error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payroll/runs
router.get('/runs', async (req, res) => {
  try {
    const runs = await db('payroll_runs')
      .where({ company_id: req.user.companyId })
      .orderBy([{ column: 'year', order: 'desc' }, { column: 'month', order: 'desc' }]);
    res.json({ data: runs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payroll/runs/:id (with items)
router.get('/runs/:id', async (req, res) => {
  try {
    const run = await db('payroll_runs')
      .where({ id: req.params.id, company_id: req.user.companyId }).first();
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });

    const items = await db('payroll_items as pi')
      .join('employees as e', 'pi.employee_id', 'e.id')
      .where('pi.payroll_run_id', run.id)
      .select('pi.*', 'e.name as employee_name', 'e.ic_number', 'e.epf_number');

    res.json({ data: { ...run, items } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payroll/runs/:id/approve
router.put('/runs/:id/approve', requireRole('owner'), async (req, res) => {
  try {
    const [run] = await db('payroll_runs')
      .where({ id: req.params.id, company_id: req.user.companyId, status: 'draft' })
      .update({ status: 'approved', approved_by: req.user.userId, approved_at: new Date(), updated_at: new Date() })
      .returning('*');
    if (!run) return res.status(404).json({ error: 'Payroll run not found or not in draft status' });
    res.json({ message: 'Payroll approved', data: run });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
