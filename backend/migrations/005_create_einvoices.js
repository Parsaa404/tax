/**
 * Migration: Create e-invoice table (LHDN MyInvois)
 */
exports.up = function (knex) {
  return knex.schema.createTable('einvoices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.uuid('invoice_id').notNullable().references('id').inTable('invoices').onDelete('CASCADE');
    // LHDN digital identifiers
    table.string('uuid').unique();            // LHDN document UUID
    table.string('submission_uid').unique();  // Submission UID
    table.string('long_id');                  // Long ID (for QR)
    // Status
    table.enum('validation_status', [
      'pending', 'valid', 'invalid', 'cancelled'
    ]).defaultTo('pending');
    table.string('lhdn_status');              // Raw LHDN response status
    table.jsonb('validation_errors');         // Any validation errors from LHDN
    // Digital proof
    table.text('qr_code_url');
    table.text('digital_signature');
    // Full payload store
    table.jsonb('json_payload');
    table.jsonb('lhdn_response');
    // Timestamps
    table.timestamp('submitted_at');
    table.timestamp('validated_at');
    table.timestamp('cancelled_at');
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('einvoices');
};
