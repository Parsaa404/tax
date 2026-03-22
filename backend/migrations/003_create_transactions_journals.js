/**
 * Migration: Create transactions and journal entries tables
 */
exports.up = function (knex) {
  return knex.schema
    .createTable('transactions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
      table.enum('transaction_type', [
        'invoice', 'expense', 'payroll', 'asset_purchase',
        'journal', 'receipt', 'payment', 'transfer'
      ]).notNullable();
      table.uuid('reference_id');       // FK to invoices/expenses/payroll_runs etc.
      table.string('reference_type');   // 'invoice', 'expense', 'payroll_run', etc.
      table.decimal('amount', 15, 2).notNullable();
      table.string('currency', 3).defaultTo('MYR');
      table.decimal('exchange_rate', 10, 6).defaultTo(1.000000);
      table.text('description');
      table.date('transaction_date').notNullable();
      table.enum('status', ['pending', 'posted', 'void', 'reversed']).defaultTo('pending');
      table.uuid('created_by').references('id').inTable('users');
      table.timestamps(true, true);
    })
    .createTable('journal_entries', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
      table.uuid('transaction_id').references('id').inTable('transactions').onDelete('CASCADE');
      table.date('entry_date').notNullable();
      table.string('reference');
      table.text('narration');
      table.enum('status', ['draft', 'posted', 'void']).defaultTo('posted');
      table.uuid('created_by').references('id').inTable('users');
      table.timestamps(true, true);
    })
    .createTable('journal_lines', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('journal_entry_id').notNullable().references('id').inTable('journal_entries').onDelete('CASCADE');
      table.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('RESTRICT');
      table.decimal('debit', 15, 2).defaultTo(0);
      table.decimal('credit', 15, 2).defaultTo(0);
      table.text('description');
      table.integer('line_number');
      table.timestamps(true, true);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('journal_lines')
    .dropTableIfExists('journal_entries')
    .dropTableIfExists('transactions');
};
