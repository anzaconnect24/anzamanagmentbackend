"use strict";

// Where each startup stands within its programme. Needed for the Program
// Dashboard's active / completed / at-risk / dropped-out breakdown — nothing
// recorded this before, so every existing member starts as "active".
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("cohort_memberships", "status", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "active",
    });

    await queryInterface.addIndex("cohort_memberships", ["status"], {
      name: "cohort_memberships_status_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "cohort_memberships",
      "cohort_memberships_status_idx",
    );
    await queryInterface.removeColumn("cohort_memberships", "status");
  },
};
