"use strict";

// Modules used to hang off a course (Programs), which in turn was opened to a
// cohort programme. The course layer is gone: a module now belongs straight to
// the programme startups enrol in, so the chain is Programme -> Module -> Slide.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Modules", "cohortProgramId", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addIndex("Modules", ["cohortProgramId"], {
      name: "modules_cohort_program_id",
    });

    // Modules authored against a programme have no course.
    await queryInterface.sequelize.query(
      "ALTER TABLE Modules MODIFY programId VARCHAR(255) NULL",
    );

    // Move each existing module onto the programme its course was open to.
    await queryInterface.sequelize.query(`
      UPDATE Modules m
      JOIN class_program_access a ON a.courseId = CAST(m.programId AS UNSIGNED)
      SET m.cohortProgramId = a.cohortProgramId
      WHERE m.cohortProgramId IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("Modules", "modules_cohort_program_id");
    await queryInterface.removeColumn("Modules", "cohortProgramId");
  },
};
