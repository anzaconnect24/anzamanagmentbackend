"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Change allowNull on amount to true
    await queryInterface.changeColumn("InvestmentOpportunities", "amount", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    // Change allowNull on investmentType to true
    await queryInterface.changeColumn(
      "InvestmentOpportunities",
      "investmentType",
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );
  },

  async down(queryInterface, Sequelize) {
    // Revert allowNull to false for amount
    await queryInterface.changeColumn("InvestmentOpportunities", "amount", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    });

    // Revert allowNull to false for investmentType
    await queryInterface.changeColumn(
      "InvestmentOpportunities",
      "investmentType",
      {
        type: Sequelize.STRING,
        allowNull: false,
      }
    );
  },
};
