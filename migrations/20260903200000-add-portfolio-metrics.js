"use strict";

// Metrics shown on a programme's Startup Portfolio table.
//
// Three belong to the startup itself, so they live on Businesses:
//   jobsCreated             - headcount the venture supports (Jobs column)
//   capitalRaised           - USD raised to date (Capital Raised column).
//                             Distinct from investmentAmount, which is what a
//                             startup is *seeking*, not what it has raised.
//   previousQuarterRevenue  - last quarter's revenue. Revenue Growth is
//                             computed against the existing `revenue` column
//                             rather than stored, so the two can never drift.
//
// Reporting status is per-programme (a startup can be up to date on one and
// behind on another), so it lives on the membership.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Businesses", "jobsCreated", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn("Businesses", "capitalRaised", {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn("Businesses", "previousQuarterRevenue", {
      type: Sequelize.DOUBLE,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn("cohort_memberships", "reportingStatus", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "pending",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("cohort_memberships", "reportingStatus");
    await queryInterface.removeColumn("Businesses", "previousQuarterRevenue");
    await queryInterface.removeColumn("Businesses", "capitalRaised");
    await queryInterface.removeColumn("Businesses", "jobsCreated");
  },
};
