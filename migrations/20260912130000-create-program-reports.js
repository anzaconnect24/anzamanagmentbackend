"use strict";

// Programme reports: monthly, quarterly, donor and final.
//
// The figures are computed from the programme's own records, but they are
// stored on the report as a frozen snapshot rather than recomputed on every
// read. A report sent to a donor in October must still say in March what it
// said in October - if it recomputed, last quarter's report would silently
// change every time an activity was edited.
//
// The narrative is kept separately from the snapshot: the numbers come from
// the system, the interpretation comes from the lead, and neither should
// overwrite the other.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("program_reports", {
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

      reportType: { type: Sequelize.STRING, allowNull: false },
      title: { type: Sequelize.STRING, allowNull: false },
      periodStart: { type: Sequelize.DATEONLY, allowNull: true },
      periodEnd: { type: Sequelize.DATEONLY, allowNull: true },

      // draft while it is being written; final once it has gone out, after
      // which the snapshot is not refreshed again.
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: "draft" },

      // The computed figures, as they stood when the report was built.
      snapshot: { type: Sequelize.JSON, allowNull: true },

      // The lead's own words, keyed by section.
      narrative: { type: Sequelize.JSON, allowNull: true },

      generatedAt: { type: Sequelize.DATE, allowNull: true },
      createdById: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface
      .addIndex("program_reports", ["cohortProgramId", "reportType"], {
        name: "program_reports_programme_type",
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.dropTable("program_reports");
  },
};
