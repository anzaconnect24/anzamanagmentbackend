"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("crat_question_catalog");

    if (!table.required_attachment_sw) {
      await queryInterface.addColumn(
        "crat_question_catalog",
        "required_attachment_sw",
        {
          type: Sequelize.TEXT,
          allowNull: true,
          after: "required_attachment",
        },
      );
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("crat_question_catalog");

    if (table.required_attachment_sw) {
      await queryInterface.removeColumn(
        "crat_question_catalog",
        "required_attachment_sw",
      );
    }
  },
};
