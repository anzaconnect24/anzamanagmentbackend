"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.addColumn("Businesses", "description", {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    });

    await queryInterface.addColumn("Businesses", "otherIndustry", {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("Businesses", "numberOfCustomers", {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("Businesses", "market", {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("Businesses", "location", {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("Businesses", "impact", {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    });

    await queryInterface.addColumn("Businesses", "growthPlan", {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    });

    await queryInterface.addColumn("Businesses", "fundraisingNeeds", {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    });
  },

  async down(queryInterface, DataTypes) {
    await queryInterface.removeColumn("Businesses", "description");
    await queryInterface.removeColumn("Businesses", "otherIndustry");
    await queryInterface.removeColumn("Businesses", "numberOfCustomers");
    await queryInterface.removeColumn("Businesses", "market");
    await queryInterface.removeColumn("Businesses", "location");
    await queryInterface.removeColumn("Businesses", "impact");
    await queryInterface.removeColumn("Businesses", "growthPlan");
    await queryInterface.removeColumn("Businesses", "fundraisingNeeds");
  },
};
