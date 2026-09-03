"use strict";

// A startup is either on the programme or it has dropped out. "completed" and
// "at_risk" are no longer statuses, so any row still holding one is moved back
// to "active" — otherwise it would sit on a value the API now rejects and
// could never be edited.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      "UPDATE cohort_memberships SET status = 'active' WHERE status NOT IN ('active', 'dropped_out')",
    );
  },

  // The previous distinction is not recoverable from what is stored, so this
  // is deliberately a no-op.
  async down() {},
};
