/**
 * Migration: Create payroll tables (employees, payroll_runs, payroll_items)
 */
exports.up = function (knex) {
  return knex.schema
    .createTable('employees', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
      table.string('employee_number');
      table.string('name').notNullable();
      table.string('ic_number');           // MyKad / NRIC
      table.string('passport_number');
      table.date('date_of_birth').notNullable();
      table.enum('gender', ['male', 'female']).defaultTo('male');
      table.boolean('is_muslim').defaultTo(false);      // for Zakat eligibility
      table.boolean('is_foreign').defaultTo(false);
      table.string('email');
      table.string('phone');
      table.date('employment_date').notNullable();
      table.date('termination_date');
      // Pay
      table.decimal('basic_salary', 15, 2).notNullable();
      table.enum('salary_type', ['monthly', 'hourly', 'daily']).defaultTo('monthly');
      table.enum('employment_type', ['full_time', 'part_time', 'contract']).defaultTo('full_time');
      // EPF/SOCSO/EIS
      table.string('epf_number');
      table.string('socso_number');
      table.string('eis_number');
      table.string('income_tax_number');   // PCB reference
      // Tax
      table.integer('spouse_status').defaultTo(0);   // 0=single, 1=married
      table.integer('num_children').defaultTo(0);
      // Status
      table.enum('status', ['active', 'inactive', 'terminated']).defaultTo('active');
      table.timestamps(true, true);
    })
    .createTable('payroll_runs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
      table.integer('year').notNullable();
      table.integer('month').notNullable(); // 1-12
      table.string('run_reference');
      table.decimal('total_gross', 15, 2).defaultTo(0);
      table.decimal('total_epf_employee', 15, 2).defaultTo(0);
      table.decimal('total_epf_employer', 15, 2).defaultTo(0);
      table.decimal('total_socso_employee', 15, 2).defaultTo(0);
      table.decimal('total_socso_employer', 15, 2).defaultTo(0);
      table.decimal('total_eis_employee', 15, 2).defaultTo(0);
      table.decimal('total_eis_employer', 15, 2).defaultTo(0);
      table.decimal('total_pcb', 15, 2).defaultTo(0);
      table.decimal('total_zakat', 15, 2).defaultTo(0);
      table.decimal('total_net', 15, 2).defaultTo(0);
      table.decimal('total_employer_cost', 15, 2).defaultTo(0);
      table.enum('status', ['draft', 'approved', 'paid', 'void']).defaultTo('draft');
      table.uuid('approved_by').references('id').inTable('users');
      table.timestamp('approved_at');
      table.uuid('created_by').references('id').inTable('users');
      table.timestamps(true, true);
      table.unique(['company_id', 'year', 'month']);
    })
    .createTable('payroll_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('payroll_run_id').notNullable().references('id').inTable('payroll_runs').onDelete('CASCADE');
      table.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('RESTRICT');
      table.decimal('basic_salary', 15, 2).defaultTo(0);
      table.decimal('allowances', 15, 2).defaultTo(0);
      table.decimal('overtime', 15, 2).defaultTo(0);
      table.decimal('bonus', 15, 2).defaultTo(0);
      table.decimal('gross_salary', 15, 2).defaultTo(0);
      // Deductions
      table.decimal('epf_employee', 15, 2).defaultTo(0);
      table.decimal('epf_employer', 15, 2).defaultTo(0);
      table.decimal('socso_employee', 15, 2).defaultTo(0);
      table.decimal('socso_employer', 15, 2).defaultTo(0);
      table.decimal('eis_employee', 15, 2).defaultTo(0);
      table.decimal('eis_employer', 15, 2).defaultTo(0);
      table.decimal('pcb', 15, 2).defaultTo(0);
      table.decimal('zakat', 15, 2).defaultTo(0);
      table.decimal('other_deductions', 15, 2).defaultTo(0);
      // Net
      table.decimal('net_salary', 15, 2).defaultTo(0);
      table.decimal('employer_cost', 15, 2).defaultTo(0);   // gross + epf_empr + socso_empr + eis_empr
      table.jsonb('calculation_details'); // detailed breakdown
      table.timestamps(true, true);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('payroll_items')
    .dropTableIfExists('payroll_runs')
    .dropTableIfExists('employees');
};
