"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add the version column
    await queryInterface.addColumn("crat_reviews", "version", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });

    // 2. Remove the unique constraint from entrepreneur_id
    // First, find the constraint name by querying info schema, then drop it.
    // Sequelize generates the constraint name as "<table>_<column>_key"
    try {
      await queryInterface.removeConstraint(
        "crat_reviews",
        "crat_reviews_entrepreneur_id_key",
      );
    } catch (err) {
      // If the constraint name differs, try raw SQL as fallback
      console.warn(
        "Could not remove constraint by name, trying raw SQL:",
        err.message,
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE crat_reviews DROP CONSTRAINT IF EXISTS crat_reviews_entrepreneur_id_key;`,
      );
    }
  },

  async down(queryInterface, Sequelize) {
    // Re-add the unique constraint
    await queryInterface.addConstraint("crat_reviews", {
      fields: ["entrepreneur_id"],
      type: "unique",
      name: "crat_reviews_entrepreneur_id_key",
    });

    // Remove the version column
    await queryInterface.removeColumn("crat_reviews", "version");
  },
};
