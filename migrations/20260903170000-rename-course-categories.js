"use strict";

// Class Rooms groups courses by Programs.programCategory, and those category
// names are now the same three the programmes use:
//
//   Ideation, Business Foundation Accelerator, Investment Readiness Accelerator
//
// Existing courses were filed under the shorter names, so they would stop
// matching the category cards once those are renamed. This brings them across.
//
// Only course rows are touched — grant and mentorship programs use
// programCategory as their own grouping label and are left alone.
const RENAMES = [
  ["Business Foundation", "Business Foundation Accelerator"],
  ["Investment Readiness", "Investment Readiness Accelerator"],
  // "Ideation" is unchanged.
];

const isCourse = "(type IS NULL OR type NOT IN ('grant', 'mentorship'))";

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    for (const [from, to] of RENAMES) {
      await sequelize.query(
        `UPDATE Programs SET programCategory = :to
         WHERE programCategory = :from AND ${isCourse}`,
        { replacements: { from, to } },
      );
    }
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    for (const [from, to] of RENAMES) {
      await sequelize.query(
        `UPDATE Programs SET programCategory = :from
         WHERE programCategory = :to AND ${isCourse}`,
        { replacements: { from, to } },
      );
    }
  },
};
