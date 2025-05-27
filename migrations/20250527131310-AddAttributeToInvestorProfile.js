"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.addColumn("InvestorProfiles", "seeking", {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("InvestorProfiles", "seeking");
  },
};
