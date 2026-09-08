"use strict";

// CRAT questions can belong to a programme.
//
// A question with a programme is only asked of the startups enrolled in it;
// a question with none is asked of everyone, which is what every existing
// question becomes, so nothing changes for assessments already in progress.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      "crat_question_catalog",
      "cohort_program_id",
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
    );

    await queryInterface.addIndex(
      "crat_question_catalog",
      ["cohort_program_id"],
      { name: "crat_questions_cohort_program" },
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "crat_question_catalog",
      "crat_questions_cohort_program",
    );
    await queryInterface.removeColumn(
      "crat_question_catalog",
      "cohort_program_id",
    );
  },
};
