/**
 * Migration: Create tax tables (tax_rules, tax_computations, tax_adjustments, tax_filings, tax_deadlines)
 */
exports.up = function (knex) {
  return knex.schema
    .createTable('tax_computations', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
      table.integer('year_of_assessment').notNullable(); // e.g. 2024
      // Income
      table.decimal('gross_revenue', 15, 2).defaultTo(0);
      table.decimal('total_income', 15, 2).defaultTo(0);
      table.decimal('total_allowable_expenses', 15, 2).defaultTo(0);
      table.decimal('adjusted_income', 15, 2).defaultTo(0);
      // Capital Allowances
      table.decimal('total_capital_allowance', 15, 2).defaultTo(0);
      table.decimal('statutory_income', 15, 2).defaultTo(0); // adjusted_income - capital_allowance
      // Losses
      table.decimal('losses_brought_forward', 15, 2).defaultTo(0);
      table.decimal('chargeable_income', 15, 2).defaultTo(0); // statutory_income - losses
      // Tax
      table.boolean('is_sme').defaultTo(true);
      table.decimal('tax_on_first_band', 15, 2).defaultTo(0);  // 15% band
      table.decimal('tax_on_second_band', 15, 2).defaultTo(0); // 17% band
      table.decimal('tax_on_remainder', 15, 2).defaultTo(0);   // 24% band
      table.decimal('tax_before_rebates', 15, 2).defaultTo(0);
      // Rebates & incentives
      table.decimal('zakat_offset', 15, 2).defaultTo(0);
      table.decimal('pioneer_status_exemption', 15, 2).defaultTo(0);
      table.decimal('reinvestment_allowance', 15, 2).defaultTo(0);
      table.decimal('tax_after_rebates', 15, 2).defaultTo(0);
      // Payments
      table.decimal('cp204_paid', 15, 2).defaultTo(0);          // installment payments
      table.decimal('balance_tax_payable', 15, 2).defaultTo(0);
      // Status
      table.enum('status', ['draft', 'finalized', 'filed', 'amended']).defaultTo('draft');
      table.jsonb('computation_details');  // full breakdown
      table.timestamps(true, true);
      table.unique(['company_id', 'year_of_assessment']);
    })
    .createTable('tax_adjustments', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tax_computation_id').notNullable().references('id').inTable('tax_computations').onDelete('CASCADE');
      table.enum('type', ['add_back', 'deduct']).notNullable();
      table.string('description').notNullable();
      table.decimal('amount', 15, 2).notNullable();
      table.string('section_reference'); // e.g. "Section 39(1)(a)"
      table.timestamps(true, true);
    })
    .createTable('tax_filings', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
      table.enum('form_type', ['Form_C', 'Form_E', 'CP204', 'CP204A', 'CP500', 'SST_02', 'SST_02A']).notNullable();
      table.integer('year_of_assessment');
      table.integer('period_month'); // for SST - month of period
      table.date('due_date').notNullable();
      table.date('filed_date');
      table.decimal('amount_payable', 15, 2).defaultTo(0);
      table.decimal('amount_paid', 15, 2).defaultTo(0);
      table.enum('status', ['pending', 'filed', 'overdue', 'amended']).defaultTo('pending');
      table.text('notes');
      table.timestamps(true, true);
    })
    .createTable('tax_deadlines', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
      table.string('title').notNullable();
      table.text('description');
      table.enum('deadline_type', [
        'Form_C', 'Form_E', 'EA_Form', 'CP204', 'CP204A', 'SST', 'PCB', 'EPF', 'SOCSO', 'EIS'
      ]).notNullable();
      table.date('due_date').notNullable();
      table.boolean('is_completed').defaultTo(false);
      table.date('completed_date');
      table.enum('priority', ['low', 'medium', 'high', 'critical']).defaultTo('medium');
      table.timestamps(true, true);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('tax_deadlines')
    .dropTableIfExists('tax_filings')
    .dropTableIfExists('tax_adjustments')
    .dropTableIfExists('tax_computations');
};
