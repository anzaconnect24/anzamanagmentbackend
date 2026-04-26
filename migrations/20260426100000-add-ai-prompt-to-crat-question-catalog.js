"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("crat_question_catalog", "ai_prompt", {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
      after: "required_attachment",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("crat_question_catalog", "ai_prompt");
  },
};
