"use strict";

// Surveys can now reach beyond one programme.
//
// A survey used to belong to exactly one programme, and only that programme's
// startups could answer it. The M&E Officer also needs to ask every startup on
// the platform at once, or a handful of people chosen by name.
//
// audience says who a survey is for:
//   program       - the startups on cohortProgramId. What every survey was
//                   before this, so existing rows default to it.
//   all_startups  - every startup account on the platform.
//   users         - the people listed in survey_recipients.
//
// cohortProgramId becomes nullable because the last two belong to no programme.
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("surveys");

    if (!table.audience) {
      await queryInterface.addColumn("surveys", "audience", {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "program",
      });
    }

    await queryInterface.changeColumn("surveys", "cohortProgramId", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // The M&E Officer's list reads by audience; a respondent's by audience and
    // status together.
    await queryInterface
      .addIndex("surveys", ["audience", "status"], {
        name: "surveys_audience_status",
      })
      .catch(() => {});

    await queryInterface.createTable("survey_recipients", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      surveyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "surveys", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    // A person is on a survey's list once.
    await queryInterface
      .addIndex("survey_recipients", ["surveyId", "userId"], {
        name: "survey_recipients_unique",
        unique: true,
      })
      .catch(() => {});

    // "Which surveys was I sent?" is read by person.
    await queryInterface
      .addIndex("survey_recipients", ["userId"], {
        name: "survey_recipients_by_user",
      })
      .catch(() => {});

    // Someone who runs no business answers once per account rather than once
    // per business, so their response is found by user.
    await queryInterface
      .addIndex("survey_responses", ["surveyId", "userId"], {
        name: "survey_responses_survey_user",
      })
      .catch(() => {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface
      .removeIndex("survey_responses", "survey_responses_survey_user")
      .catch(() => {});

    await queryInterface.dropTable("survey_recipients");

    // A survey that belongs to no programme cannot survive cohortProgramId
    // becoming required again, so it goes - with its questions and answers,
    // which have no foreign keys to take them along.
    const drop = [
      "DELETE a FROM survey_answers a JOIN survey_responses r ON r.id = a.responseId JOIN surveys s ON s.id = r.surveyId WHERE s.cohortProgramId IS NULL",
      "DELETE r FROM survey_responses r JOIN surveys s ON s.id = r.surveyId WHERE s.cohortProgramId IS NULL",
      "DELETE q FROM survey_questions q JOIN surveys s ON s.id = q.surveyId WHERE s.cohortProgramId IS NULL",
      "DELETE FROM surveys WHERE cohortProgramId IS NULL",
    ];
    for (const sql of drop) await queryInterface.sequelize.query(sql);

    await queryInterface
      .removeIndex("surveys", "surveys_audience_status")
      .catch(() => {});

    await queryInterface.changeColumn("surveys", "cohortProgramId", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    await queryInterface.removeColumn("surveys", "audience");
  },
};
