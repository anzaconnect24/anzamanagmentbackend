"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add expireDate column to Programs table
    await queryInterface.addColumn("Programs", "expireDate", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Date when the program expires",
    });

    // Add expireDate column to InvestmentOpportunities table
    await queryInterface.addColumn("InvestmentOpportunities", "expireDate", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Date when the investment opportunity expires",
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove expireDate column from Programs table
    await queryInterface.removeColumn("Programs", "expireDate");

    // Remove expireDate column from InvestmentOpportunities table
    await queryInterface.removeColumn("InvestmentOpportunities", "expireDate");
  },
};
