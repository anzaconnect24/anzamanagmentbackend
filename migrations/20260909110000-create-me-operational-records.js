"use strict";

const base = (Sequelize) => ({
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
  uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
  createdAt: { type: Sequelize.DATE, allowNull: false },
  updatedAt: { type: Sequelize.DATE, allowNull: false },
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("me_assessments", {
      ...base(Sequelize),
      cohortProgramId: { type: Sequelize.INTEGER, allowNull: false, references: { model: "cohort_programs", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      cohortMembershipId: { type: Sequelize.INTEGER, allowNull: true, references: { model: "cohort_memberships", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" },
      businessId: { type: Sequelize.INTEGER, allowNull: false, references: { model: "businesses", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      assessorId: { type: Sequelize.INTEGER, allowNull: true, references: { model: "users", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" },
      assessmentType: { type: Sequelize.STRING, allowNull: false },
      assessmentDate: { type: Sequelize.DATEONLY, allowNull: false },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: "draft" },
      performanceMetrics: { type: Sequelize.JSON, allowNull: true },
      capabilityScores: { type: Sequelize.JSON, allowNull: true },
      answers: { type: Sequelize.JSON, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      submittedAt: { type: Sequelize.DATE, allowNull: true },
      verifiedById: { type: Sequelize.INTEGER, allowNull: true, references: { model: "users", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" },
      verifiedAt: { type: Sequelize.DATE, allowNull: true },
      reviewComments: { type: Sequelize.TEXT, allowNull: true },
    });
    await queryInterface.addIndex("me_assessments", ["cohortProgramId", "businessId", "assessmentType"], { name: "me_assessments_scope_type" });
    await queryInterface.addIndex("me_assessments", ["status", "assessmentDate"], { name: "me_assessments_status_date" });

    await queryInterface.createTable("me_periodic_reports", {
      ...base(Sequelize),
      cohortProgramId: { type: Sequelize.INTEGER, allowNull: false, references: { model: "cohort_programs", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      cohortMembershipId: { type: Sequelize.INTEGER, allowNull: true, references: { model: "cohort_memberships", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" },
      businessId: { type: Sequelize.INTEGER, allowNull: false, references: { model: "businesses", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      reportingPeriod: { type: Sequelize.STRING, allowNull: false },
      periodStart: { type: Sequelize.DATEONLY, allowNull: true },
      periodEnd: { type: Sequelize.DATEONLY, allowNull: true },
      dueDate: { type: Sequelize.DATEONLY, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: "draft" },
      revenue: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
      employees: { type: Sequelize.INTEGER, allowNull: true },
      jobsCreated: { type: Sequelize.INTEGER, allowNull: true },
      customersServed: { type: Sequelize.INTEGER, allowNull: true },
      fundingReceived: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
      partnershipsEstablished: { type: Sequelize.INTEGER, allowNull: true },
      marketsEntered: { type: Sequelize.INTEGER, allowNull: true },
      keyMilestone: { type: Sequelize.TEXT, allowNull: true },
      biggestChallenge: { type: Sequelize.TEXT, allowNull: true },
      supportRequired: { type: Sequelize.TEXT, allowNull: true },
      comments: { type: Sequelize.TEXT, allowNull: true },
      submittedById: { type: Sequelize.INTEGER, allowNull: true, references: { model: "users", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" },
      submittedAt: { type: Sequelize.DATE, allowNull: true },
      reviewedById: { type: Sequelize.INTEGER, allowNull: true, references: { model: "users", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" },
      reviewedAt: { type: Sequelize.DATE, allowNull: true },
      reviewComments: { type: Sequelize.TEXT, allowNull: true },
    });
    await queryInterface.addIndex("me_periodic_reports", ["cohortProgramId", "businessId", "reportingPeriod"], { name: "me_reports_scope_period", unique: true });
    await queryInterface.addIndex("me_periodic_reports", ["status", "dueDate"], { name: "me_reports_status_due" });

    await queryInterface.createTable("me_business_metrics", {
      ...base(Sequelize),
      cohortProgramId: { type: Sequelize.INTEGER, allowNull: true, references: { model: "cohort_programs", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" },
      businessId: { type: Sequelize.INTEGER, allowNull: false, references: { model: "businesses", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      reportId: { type: Sequelize.INTEGER, allowNull: true, references: { model: "me_periodic_reports", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" },
      metricCode: { type: Sequelize.STRING, allowNull: false },
      reportingDate: { type: Sequelize.DATEONLY, allowNull: false },
      numericValue: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
      textValue: { type: Sequelize.TEXT, allowNull: true },
      unit: { type: Sequelize.STRING, allowNull: true },
      verificationStatus: { type: Sequelize.STRING, allowNull: false, defaultValue: "pending" },
      recordedById: { type: Sequelize.INTEGER, allowNull: true },
    });
    await queryInterface.addIndex("me_business_metrics", ["businessId", "metricCode", "reportingDate"], { name: "me_metrics_business_trend" });
    await queryInterface.addIndex("me_business_metrics", ["cohortProgramId", "metricCode", "reportingDate"], { name: "me_metrics_programme_aggregate" });

    await queryInterface.createTable("me_evidence", {
      ...base(Sequelize),
      cohortProgramId: { type: Sequelize.INTEGER, allowNull: true, references: { model: "cohort_programs", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" },
      businessId: { type: Sequelize.INTEGER, allowNull: true, references: { model: "businesses", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      entityType: { type: Sequelize.STRING, allowNull: false },
      entityUuid: { type: Sequelize.UUID, allowNull: false },
      evidenceType: { type: Sequelize.STRING, allowNull: false },
      fileUrl: { type: Sequelize.TEXT, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      verificationStatus: { type: Sequelize.STRING, allowNull: false, defaultValue: "pending" },
      uploadedById: { type: Sequelize.INTEGER, allowNull: true },
      verifiedById: { type: Sequelize.INTEGER, allowNull: true },
      verifiedAt: { type: Sequelize.DATE, allowNull: true },
      rejectionReason: { type: Sequelize.TEXT, allowNull: true },
    });
    await queryInterface.addIndex("me_evidence", ["entityType", "entityUuid"], { name: "me_evidence_entity" });
    await queryInterface.addIndex("me_evidence", ["cohortProgramId", "verificationStatus"], { name: "me_evidence_programme_status" });

    await queryInterface.createTable("me_data_quality_flags", {
      ...base(Sequelize),
      cohortProgramId: { type: Sequelize.INTEGER, allowNull: true },
      businessId: { type: Sequelize.INTEGER, allowNull: true },
      entityType: { type: Sequelize.STRING, allowNull: false },
      entityUuid: { type: Sequelize.UUID, allowNull: true },
      ruleCode: { type: Sequelize.STRING, allowNull: false },
      severity: { type: Sequelize.STRING, allowNull: false, defaultValue: "warning" },
      message: { type: Sequelize.TEXT, allowNull: false },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: "open" },
      detectedAt: { type: Sequelize.DATE, allowNull: false },
      resolvedById: { type: Sequelize.INTEGER, allowNull: true },
      resolvedAt: { type: Sequelize.DATE, allowNull: true },
      resolutionNotes: { type: Sequelize.TEXT, allowNull: true },
    });
    await queryInterface.addIndex("me_data_quality_flags", ["cohortProgramId", "status", "severity"], { name: "me_quality_programme_status" });
    await queryInterface.addIndex("me_data_quality_flags", ["businessId", "status"], { name: "me_quality_business_status" });
  },

  async down(queryInterface) {
    for (const table of ["me_data_quality_flags", "me_evidence", "me_business_metrics", "me_periodic_reports", "me_assessments"]) await queryInterface.dropTable(table);
  },
};
