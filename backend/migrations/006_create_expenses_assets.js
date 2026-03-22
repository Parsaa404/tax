/**
 * Migration: Create expenses and fixed assets tables
 */
exports.up = function (knex) {
  return knex.schema
    .createTable('expenses', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
      table.string('expense_number');
      table.string('vendor_name');
      table.string('vendor_registration');
      table.date('expense_date').notNullable();
      table.decimal('amount', 15, 2).notNullable();
      table.string('currency', 3).defaultTo('MYR');
      // Tax deductibility
      table.enum('category', [
        'rent', 'utilities', 'salaries', 'marketing', 'professional_fees',
        'travel', 'entertainment', 'depreciation', 'repairs', 'insurance',
        'interest', 'research_development', 'training', 'capital_purchase', 'other'
      ]).defaultTo('other');
      table.boolean('is_tax_deductible').defaultTo(true);
      table.decimal('deductible_rate', 5, 2).defaultTo(100); // % deductible
      table.enum('tax_type', ['none', 'SST', 'withholding']).defaultTo('none');
      table.decimal('tax_amount', 15, 2).defaultTo(0);
      table.text('description');
      table.string('receipt_url');  // file attachment
      table.uuid('account_id').references('id').inTable('accounts');
      table.enum('status', ['pending', 'approved', 'posted', 'void']).defaultTo('pending');
      table.uuid('created_by').references('id').inTable('users');
      table.timestamps(true, true);
    })
    .createTable('fixed_assets', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
      table.string('asset_name').notNullable();
      table.string('asset_code').unique();
      table.enum('asset_category', [
        'plant_machinery', 'motor_vehicles', 'office_equipment',
        'furniture', 'computers', 'building', 'land', 'other'
      ]).notNullable();
      table.date('acquisition_date').notNullable();
      table.decimal('cost', 15, 2).notNullable();         // original cost
      table.decimal('residual_value', 15, 2).defaultTo(0); // salvage value
      table.integer('useful_life_years');                  // for accounting depreciation
      // Capital Allowance
      table.decimal('initial_allowance_rate', 5, 2);      // IA rate (%)
      table.decimal('annual_allowance_rate', 5, 2);       // AA rate (%)
      table.decimal('total_ca_claimed', 15, 2).defaultTo(0); // total CA to date
      table.decimal('residual_expenditure', 15, 2);        // cost - total CA
      // Accounting depreciation
      table.enum('depreciation_method', ['straight_line', 'reducing_balance']).defaultTo('straight_line');
      table.decimal('accumulated_depreciation', 15, 2).defaultTo(0);
      table.decimal('book_value', 15, 2);
      // Status
      table.enum('status', ['active', 'disposed', 'written_off']).defaultTo('active');
      table.date('disposal_date');
      table.decimal('disposal_proceeds', 15, 2);
      table.uuid('account_id').references('id').inTable('accounts');
      table.timestamps(true, true);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('fixed_assets')
    .dropTableIfExists('expenses');
};
