"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Programs", "startDate", {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: "Program timeline start date",
    });

    await queryInterface.addColumn("Programs", "endDate", {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: "Program timeline end date",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("Programs", "startDate");
    await queryInterface.removeColumn("Programs", "endDate");
  },
};
