"use strict";

// Existing rows remain top-level programmes. New child rows can represent
// cohorts, so this migration does not rewrite or delete production data.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("cohort_programs", "parentProgrammeId", {
      type: Sequelize.INTEGER, allowNull: true,
      references: { model: "cohort_programs", key: "id" },
      onUpdate: "CASCADE", onDelete: "SET NULL",
    });
    const programmeColumns = {
      recordType: { type: Sequelize.STRING, allowNull: false, defaultValue: "programme" },
      objective: { type: Sequelize.TEXT, allowNull: true },
      partner: { type: Sequelize.STRING, allowNull: true },
      geographicScope: { type: Sequelize.STRING, allowNull: true },
      programmeManagerId: { type: Sequelize.INTEGER, allowNull: true, references: { model: "users", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      reportingFrequency: { type: Sequelize.STRING, allowNull: false, defaultValue: "quarterly" },
      targetParticipants: { type: Sequelize.INTEGER, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: "active" },
      archivedAt: { type: Sequelize.DATE, allowNull: true },
    };
    for (const [name, definition] of Object.entries(programmeColumns)) {
      await queryInterface.addColumn("cohort_programs", name, definition);
    }
    await queryInterface.addIndex("cohort_programs", ["parentProgrammeId", "recordType"], { name: "cohort_programs_hierarchy" });
    await queryInterface.addIndex("cohort_programs", ["status", "startDate", "endDate"], { name: "cohort_programs_status_dates" });

    const participationColumns = {
      enrollmentDate: { type: Sequelize.DATEONLY, allowNull: true },
      completionStatus: { type: Sequelize.STRING, allowNull: false, defaultValue: "not_started" },
      completionDate: { type: Sequelize.DATEONLY, allowNull: true },
      assignedMentorId: { type: Sequelize.INTEGER, allowNull: true, references: { model: "users", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      assignedAdvisorId: { type: Sequelize.INTEGER, allowNull: true, references: { model: "users", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      baselineCompleted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      endlineCompleted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      attendanceRate: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      participationNotes: { type: Sequelize.TEXT, allowNull: true },
    };
    for (const [name, definition] of Object.entries(participationColumns)) {
      await queryInterface.addColumn("cohort_memberships", name, definition);
    }
    await queryInterface.addIndex("cohort_memberships", ["assignedMentorId"], { name: "cohort_memberships_mentor" });
    await queryInterface.addIndex("cohort_memberships", ["assignedAdvisorId"], { name: "cohort_memberships_advisor" });
    await queryInterface.addIndex("cohort_memberships", ["status", "completionStatus"], { name: "cohort_memberships_participation_status" });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("cohort_memberships", "cohort_memberships_participation_status");
    await queryInterface.removeIndex("cohort_memberships", "cohort_memberships_advisor");
    await queryInterface.removeIndex("cohort_memberships", "cohort_memberships_mentor");
    for (const name of ["participationNotes", "attendanceRate", "endlineCompleted", "baselineCompleted", "assignedAdvisorId", "assignedMentorId", "completionDate", "completionStatus", "enrollmentDate"]) await queryInterface.removeColumn("cohort_memberships", name);
    await queryInterface.removeIndex("cohort_programs", "cohort_programs_status_dates");
    await queryInterface.removeIndex("cohort_programs", "cohort_programs_hierarchy");
    for (const name of ["archivedAt", "status", "targetParticipants", "reportingFrequency", "programmeManagerId", "geographicScope", "partner", "objective", "recordType", "parentProgrammeId"]) await queryInterface.removeColumn("cohort_programs", name);
  },
};
