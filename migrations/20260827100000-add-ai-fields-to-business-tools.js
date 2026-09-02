"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("business_tools", "aiEnabled", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: "thumbnailUrl",
    });
    await queryInterface.addColumn("business_tools", "aiPrompt", {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
      after: "aiEnabled",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("business_tools", "aiPrompt");
    await queryInterface.removeColumn("business_tools", "aiEnabled");
  },
};
