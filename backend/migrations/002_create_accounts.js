/**
 * Migration: Create chart of accounts table
 */
exports.up = function (knex) {
  return knex.schema.createTable('accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.string('account_code').notNullable();
    table.string('account_name').notNullable();
    table.enum('account_type', ['asset', 'liability', 'equity', 'revenue', 'expense']).notNullable();
    table.uuid('parent_id').references('id').inTable('accounts').onDelete('SET NULL');
    table.text('description');
    table.boolean('is_system').defaultTo(false);  // system/default accounts cannot be deleted
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    // Unique account code per company
    table.unique(['company_id', 'account_code']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('accounts');
};
