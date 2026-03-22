/**
 * Migration 010: CGT Disposals
 * Records share disposal events for Capital Gains Tax (CGTA 2023).
 * Malaysian companies must report gains from unlisted share sales.
 */
exports.up = function (knex) {
  return knex.schema.createTable('cgt_disposals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.string('share_name').notNullable();                  // Name of company whose shares are sold
    table.string('company_reg_no');                            // SSM number of investee company
    table.boolean('is_listed').defaultTo(false);               // true = Bursa listed (CGT exempt)
    table.date('acquisition_date').notNullable();
    table.date('disposal_date').notNullable();
    table.decimal('acquisition_cost', 15, 2).notNullable();    // total cost including incidentals
    table.decimal('consideration_received', 15, 2).notNullable(); // gross proceeds
    table.decimal('incidental_costs_disposal', 15, 2).defaultTo(0); // agent fees, legal etc.
    table.decimal('gross_gain', 15, 2).notNullable();
    table.decimal('cgt_rate', 5, 4).defaultTo(0.10);          // 10% for unlisted
    table.decimal('cgt_payable', 15, 2).notNullable();
    table.enum('status', ['computed', 'filed', 'paid']).defaultTo('computed');
    table.date('payment_due_date');                            // 60 days from disposal
    table.date('payment_date');
    table.text('notes');
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('cgt_disposals');
};
