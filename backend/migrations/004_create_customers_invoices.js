/**
 * Migration: Create customers and invoices tables
 */
exports.up = function (knex) {
  return knex.schema
    .createTable('customers', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
      table.string('name').notNullable();
      table.string('registration_number');
      table.string('tax_number');
      table.string('email');
      table.string('phone');
      table.text('address');
      table.string('country', 2).defaultTo('MY');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable('invoices', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
      table.string('invoice_number').notNullable();
      table.uuid('customer_id').references('id').inTable('customers').onDelete('SET NULL');
      table.date('issue_date').notNullable();
      table.date('due_date');
      table.decimal('subtotal', 15, 2).defaultTo(0);
      table.enum('tax_type', ['SST', 'GST', 'none']).defaultTo('SST');
      table.decimal('tax_rate', 5, 2).defaultTo(8); // percentage
      table.decimal('tax_amount', 15, 2).defaultTo(0);
      table.decimal('total_amount', 15, 2).defaultTo(0);
      table.string('currency', 3).defaultTo('MYR');
      table.enum('status', ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'void']).defaultTo('draft');
      table.text('notes');
      table.string('einvoice_id');       // LHDN MyInvois UUID
      table.string('einvoice_status');   // pending, valid, invalid, cancelled
      table.uuid('created_by').references('id').inTable('users');
      table.timestamps(true, true);
      table.unique(['company_id', 'invoice_number']);
    })
    .createTable('invoice_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('invoice_id').notNullable().references('id').inTable('invoices').onDelete('CASCADE');
      table.text('description').notNullable();
      table.decimal('quantity', 10, 2).defaultTo(1);
      table.decimal('unit_price', 15, 2).notNullable();
      table.decimal('subtotal', 15, 2).notNullable();
      table.integer('line_number');
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('invoice_items')
    .dropTableIfExists('invoices')
    .dropTableIfExists('customers');
};
