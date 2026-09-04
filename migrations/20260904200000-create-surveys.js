"use strict";

// Surveys a programme runs. Own tables, like the rest of the programme
// feature — nothing here touches the shared Programs/quiz tables.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("surveys", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: { type: Sequelize.INTEGER, allowNull: false },
      title: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      // draft -> published -> closed. Only published surveys reach startups.
      status: {
        type: Sequelize.ENUM("draft", "published", "closed"),
        allowNull: false,
        defaultValue: "draft",
      },
      createdById: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex("surveys", ["cohortProgramId"], {
      name: "surveys_cohort_program_id",
    });

    await queryInterface.createTable("survey_questions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      surveyId: { type: Sequelize.INTEGER, allowNull: false },
      questionText: { type: Sequelize.TEXT, allowNull: false },
      questionType: {
        type: Sequelize.ENUM("text", "single_choice", "multiple_choice", "rating"),
        allowNull: false,
        defaultValue: "text",
      },
      // Choices for the two choice types; null for text and rating.
      options: { type: Sequelize.JSON, allowNull: true },
      required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex("survey_questions", ["surveyId"], {
      name: "survey_questions_survey_id",
    });

    await queryInterface.createTable("survey_responses", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      surveyId: { type: Sequelize.INTEGER, allowNull: false },
      businessId: { type: Sequelize.INTEGER, allowNull: true },
      userId: { type: Sequelize.INTEGER, allowNull: true },
      submittedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    // One response per startup per survey.
    await queryInterface.addIndex("survey_responses", ["surveyId", "businessId"], {
      name: "survey_responses_survey_business",
      unique: true,
    });

    await queryInterface.createTable("survey_answers", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      responseId: { type: Sequelize.INTEGER, allowNull: false },
      questionId: { type: Sequelize.INTEGER, allowNull: false },
      answerText: { type: Sequelize.TEXT, allowNull: true },
      selectedOptions: { type: Sequelize.JSON, allowNull: true },
      rating: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex("survey_answers", ["responseId"], {
      name: "survey_answers_response_id",
    });
    await queryInterface.addIndex("survey_answers", ["questionId"], {
      name: "survey_answers_question_id",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("survey_answers");
    await queryInterface.dropTable("survey_responses");
    await queryInterface.dropTable("survey_questions");
    await queryInterface.dropTable("surveys");
  },
};
