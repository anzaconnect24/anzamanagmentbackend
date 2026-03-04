"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add the version column if it doesn't exist
    const tableInfo = await queryInterface.describeTable("crat_reviews");

    if (!tableInfo.version) {
      await queryInterface.addColumn("crat_reviews", "version", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      });
      console.log("✅ Added version column to crat_reviews");
    } else {
      console.log("⚠️ version column already exists, skipping");
    }

    // 2. Remove the unique constraint from entrepreneur_id (if it exists)
    try {
      const constraints = await queryInterface.sequelize.query(
        `SELECT CONSTRAINT_NAME 
         FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
         WHERE TABLE_NAME = 'crat_reviews' 
         AND CONSTRAINT_TYPE = 'UNIQUE' 
         AND CONSTRAINT_SCHEMA = DATABASE()`,
        { type: Sequelize.QueryTypes.SELECT },
      );

      for (const constraint of constraints) {
        try {
          await queryInterface.removeConstraint(
            "crat_reviews",
            constraint.CONSTRAINT_NAME,
          );
          console.log(`✅ Removed constraint: ${constraint.CONSTRAINT_NAME}`);
        } catch (err) {
          console.warn(
            `⚠️ Could not remove constraint ${constraint.CONSTRAINT_NAME}:`,
            err.message,
          );
        }
      }
    } catch (err) {
      console.warn("⚠️ Could not check/remove constraints:", err.message);
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove the version column
    await queryInterface.removeColumn("crat_reviews", "version");
  },
};
