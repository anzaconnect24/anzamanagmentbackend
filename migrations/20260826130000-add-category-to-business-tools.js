"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("business_tools", "category", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
      after: "fileType",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("business_tools", "category");
  },
};
