"use strict";

// The programme workplan: outputs, the activities under each, and when each
// activity runs.
//
// Two tables because the shape is genuinely two levels — an output groups
// activities, and the grid draws one banner row per output with its activities
// beneath. Storing activities with a free-text output name would let the same
// output drift into several spellings and split the group.
//
// Timing is real dates, not week numbers. A week column is derived from the
// dates when the grid is drawn, so a plan stays correct if the programme
// shifts, and an activity can be compared against the implementation calendar
// — which is dated work — rather than living in its own numbering.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("program_workplan_outputs", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      uuid: {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
      },
      cohortProgramId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "cohort_programs", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      // The banner row: "Recruitment & Mobilization".
      title: { type: Sequelize.STRING, allowNull: false },

      // The output statement itself: "Recruitment and onboarding of 200 SMEs…".
      description: { type: Sequelize.TEXT, allowNull: true },

      position: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.createTable("program_workplan_activities", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      uuid: {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
      },
      outputId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "program_workplan_outputs", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      title: { type: Sequelize.TEXT, allowNull: false },
      startDate: { type: Sequelize.DATEONLY, allowNull: true },
      endDate: { type: Sequelize.DATEONLY, allowNull: true },

      // Who owns it and how it is going, so the workplan is not a static
      // picture that has to be re-read against something else.
      ownerId: { type: Sequelize.INTEGER, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: "planned" },

      position: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface
      .addIndex("program_workplan_outputs", ["cohortProgramId", "position"], {
        name: "program_workplan_outputs_order",
      })
      .catch(() => {});

    await queryInterface
      .addIndex("program_workplan_activities", ["outputId", "position"], {
        name: "program_workplan_activities_order",
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.dropTable("program_workplan_activities");
    await queryInterface.dropTable("program_workplan_outputs");
  },
};
