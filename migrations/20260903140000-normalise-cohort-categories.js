"use strict";

// Programmes now fall under exactly one of three categories:
//   Ideation, Business Foundation Accelerator, Investment Readiness Accelerator
//
// Existing values are mapped onto those where the intent is unambiguous. The
// seeder's placeholder "Accelerator" is NOT one of them and cannot be resolved
// automatically — those rows are set to NULL so they surface under
// "Uncategorised" on the grid for an Admin to assign, rather than being
// silently filed under a category nobody chose.
const MAPPING = {
  Ideation: "Ideation",
  "Business Foundation": "Business Foundation Accelerator",
  "Business Foundation Accelerator": "Business Foundation Accelerator",
  "Investment Readiness": "Investment Readiness Accelerator",
  "Investment Readiness Accelerator": "Investment Readiness Accelerator",
};

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    const [rows] = await sequelize.query(
      "SELECT id, category FROM cohort_programs",
    );

    for (const row of rows) {
      const mapped = MAPPING[String(row.category || "").trim()] || null;
      if (mapped === row.category) continue;

      await sequelize.query(
        "UPDATE cohort_programs SET category = :category WHERE id = :id",
        { replacements: { category: mapped, id: row.id } },
      );
    }
  },

  // The previous values were a placeholder the seeder wrote, so there is
  // nothing meaningful to restore.
  async down() {},
};
