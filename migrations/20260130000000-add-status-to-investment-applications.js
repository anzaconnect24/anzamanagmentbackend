"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("InvestmentApplications", "status", {
      type: Sequelize.ENUM("pending", "in_progress", "completed", "dropped"),
      allowNull: false,
      defaultValue: "pending",
      comment: "Status of investment application from entrepreneur perspective",
    });

    await queryInterface.addColumn("InvestmentApplications", "investorStatus", {
      type: Sequelize.ENUM("pending", "interested", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
      comment: "Status of investment application from investor perspective",
    });

    await queryInterface.addColumn(
      "InvestmentApplications",
      "investorResponse",
      {
        type: Sequelize.TEXT("long"),
        allowNull: true,
        comment: "Investor's response or notes",
      },
    );

    await queryInterface.addColumn("InvestmentApplications", "respondedAt", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "When investor responded to the application",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("InvestmentApplications", "status");
    await queryInterface.removeColumn(
      "InvestmentApplications",
      "investorStatus",
    );
    await queryInterface.removeColumn(
      "InvestmentApplications",
      "investorResponse",
    );
    await queryInterface.removeColumn("InvestmentApplications", "respondedAt");
  },
};
