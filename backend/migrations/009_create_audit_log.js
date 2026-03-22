/**
 * Migration: Create immutable audit_log table
 * This table records every mutation in the system for compliance.
 * Rows can NEVER be updated or deleted - enforced at application level.
 */
exports.up = function (knex) {
  return knex.schema.createTable('audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').references('id').inTable('companies').onDelete('SET NULL');
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('user_email');                // denormalized for immutability
    table.string('action').notNullable();      // CREATE, UPDATE, DELETE, LOGIN, etc.
    table.string('entity_type').notNullable(); // 'transaction', 'invoice', 'payroll_run', etc.
    table.uuid('entity_id');                   // ID of the affected record
    table.jsonb('old_values');                 // values before change
    table.jsonb('new_values');                 // values after change
    table.string('ip_address', 45);
    table.text('user_agent');
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    // NOTE: No updated_at — this table is append-only
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('audit_log');
};
