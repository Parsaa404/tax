/**
 * Migration: Create companies and users tables
 */
exports.up = function (knex) {
  return knex.schema
    .createTable('companies', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('registration_number').unique();
      table.string('tax_number').unique();
      table.string('company_type').defaultTo('Sdn Bhd'); // Sdn Bhd, Ltd, Sole Prop, Partnership
      table.decimal('paid_up_capital', 15, 2).defaultTo(0);
      table.decimal('annual_revenue', 15, 2).defaultTo(0);
      table.integer('financial_year_end').defaultTo(12); // Month number 1-12
      table.string('currency', 3).defaultTo('MYR');
      table.boolean('is_sme').defaultTo(true);
      table.boolean('is_part_of_large_group').defaultTo(false);
      table.boolean('tax_resident').defaultTo(true);
      table.string('country', 2).defaultTo('MY');
      table.string('address');
      table.string('phone');
      table.string('email');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.string('name').notNullable();
      table.string('email').notNullable().unique();
      table.string('password_hash').notNullable();
      table.enum('role', ['owner', 'accountant', 'viewer']).defaultTo('accountant');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('last_login_at');
      table.timestamps(true, true);
    });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users').dropTableIfExists('companies');
};
