"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.addColumn("Milestones", "trancheAmount", {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
    });

    await queryInterface.addColumn("Milestones", "tranchePlannedUse", {
      type: DataTypes.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("Milestones", "kpiPlan", {
      type: DataTypes.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("Milestones", "planStatus", {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("Milestones", "verificationStatus", {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("Milestones", "verificationRequested", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn("Milestones", "disbursed", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("Milestones", "disbursed");
    await queryInterface.removeColumn("Milestones", "verificationRequested");
    await queryInterface.removeColumn("Milestones", "verificationStatus");
    await queryInterface.removeColumn("Milestones", "planStatus");
    await queryInterface.removeColumn("Milestones", "kpiPlan");
    await queryInterface.removeColumn("Milestones", "tranchePlannedUse");
    await queryInterface.removeColumn("Milestones", "trancheAmount");
  },
};
