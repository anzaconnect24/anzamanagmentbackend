"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("crat_question_catalog");
    if (!table.required_attachment) {
      await queryInterface.addColumn(
        "crat_question_catalog",
        "required_attachment",
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
      );
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("crat_question_catalog");
    if (table.required_attachment) {
      await queryInterface.removeColumn(
        "crat_question_catalog",
        "required_attachment",
      );
    }
  },
};
