"use strict";

// The programme implementation calendar. me_activities already held what an
// activity was and when it happened; running a workplan needs the rest: who
// owns it, when it is due as opposed to when it is scheduled, what it is
// meant to produce, and what it was budgeted against.
//
// Built on me_activities rather than a new table so the calendar shares the
// attendance rows and the evidence links that already point at activities.
const COLUMNS = {
  // The person answerable for it, separate from facilitator (free text, often
  // an outside trainer) and createdById (whoever typed it in).
  ownerId: { type: "INTEGER", allowNull: true },

  // When it must be done by. A workshop has a date it runs on; a reporting
  // deadline or a grant milestone has a date it is due by, and the two are
  // not the same thing.
  dueDate: { type: "DATE", allowNull: true },

  // What the activity is meant to produce, and where the proof lives.
  deliverables: { type: "TEXT", allowNull: true },

  // Budgeted against spent. `cost` already carried a single figure, which is
  // kept as the actual; this adds what was planned.
  budgetPlanned: { type: "DECIMAL", allowNull: true },
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("me_activities");

    if (!table.ownerId) {
      await queryInterface.addColumn("me_activities", "ownerId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }

    if (!table.dueDate) {
      await queryInterface.addColumn("me_activities", "dueDate", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!table.deliverables) {
      await queryInterface.addColumn("me_activities", "deliverables", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!table.budgetPlanned) {
      await queryInterface.addColumn("me_activities", "budgetPlanned", {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: true,
      });
    }

    // The calendar is read by date constantly; the programme already has an
    // index through cohortProgramId, this makes the date ordering cheap.
    await queryInterface
      .addIndex("me_activities", ["cohortProgramId", "activityDate"], {
        name: "me_activities_programme_date",
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    for (const name of Object.keys(COLUMNS)) {
      await queryInterface.removeColumn("me_activities", name).catch(() => {});
    }
    await queryInterface
      .removeIndex("me_activities", "me_activities_programme_date")
      .catch(() => {});
  },
};
