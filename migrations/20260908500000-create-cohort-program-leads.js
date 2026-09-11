"use strict";

// Who runs a programme.
//
// Nothing recorded this before: cohort_programs held only its title, dates and
// category, so there was no one to tell when something happened on a cohort.
// Coaching sessions were logged against a startup with no way to reach the
// people responsible for the programme it sits on.
//
// A programme can have several leads — cohorts are co-facilitated — and a
// person can lead several programmes, so this is a join table rather than a
// column. The pair is unique: assigning the same person twice is a mistake,
// not a second assignment.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("cohort_program_leads", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "cohort_programs", key: "id" },
        onUpdate: "CASCADE",
        // Deleting a programme releases its leads; the people are untouched.
        onDelete: "CASCADE",
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex(
      "cohort_program_leads",
      ["cohortProgramId", "userId"],
      { name: "cohort_program_leads_unique", unique: true },
    );

    // "Which programmes do I lead?" runs on every notification write.
    await queryInterface.addIndex("cohort_program_leads", ["userId"], {
      name: "cohort_program_leads_user",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("cohort_program_leads");
  },
};
