"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add investorId column
    await queryInterface.addColumn("BusinessInvestmentRequests", "investorId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // Update status enum to include new statuses
    await queryInterface.changeColumn("BusinessInvestmentRequests", "status", {
      type: Sequelize.ENUM(
        "waiting",
        "accepted",
        "rejected",
        "closed",
        "in-progress",
        "completed",
      ),
      defaultValue: "waiting",
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove investorId column
    await queryInterface.removeColumn(
      "BusinessInvestmentRequests",
      "investorId",
    );

    // Revert status enum to original values
    await queryInterface.changeColumn("BusinessInvestmentRequests", "status", {
      type: Sequelize.ENUM("waiting", "accepted", "rejected", "closed"),
      defaultValue: "waiting",
      allowNull: false,
    });
  },
};
