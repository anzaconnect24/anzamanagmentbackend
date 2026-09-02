"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("business_tools", "thumbnailUrl", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
      after: "category",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("business_tools", "thumbnailUrl");
  },
};
