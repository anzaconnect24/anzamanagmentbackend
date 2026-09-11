"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class MePeriodicReport extends Model {
    static associate(models) {
      MePeriodicReport.belongsTo(models.CohortProgram, { foreignKey: "cohortProgramId" });
      MePeriodicReport.belongsTo(models.CohortMembership, { foreignKey: "cohortMembershipId" });
      MePeriodicReport.belongsTo(models.Business, { foreignKey: "businessId" });
      MePeriodicReport.hasMany(models.MeBusinessMetric, { foreignKey: "reportId" });
      MePeriodicReport.hasMany(models.MeEvidence, { foreignKey: "entityUuid", sourceKey: "uuid", constraints: false, scope: { entityType: "periodic_report" } });
    }
  }
  MePeriodicReport.init({
    uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
    cohortProgramId: { type: DataTypes.INTEGER, allowNull: false }, cohortMembershipId: DataTypes.INTEGER,
    businessId: { type: DataTypes.INTEGER, allowNull: false }, reportingPeriod: { type: DataTypes.STRING, allowNull: false },
    periodStart: DataTypes.DATEONLY, periodEnd: DataTypes.DATEONLY, dueDate: DataTypes.DATEONLY,
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "draft", validate: { isIn: [["draft", "submitted", "under_review", "verified", "rejected", "overdue"]] } },
    revenue: DataTypes.DECIMAL(18, 2), employees: DataTypes.INTEGER, jobsCreated: DataTypes.INTEGER,
    customersServed: DataTypes.INTEGER, fundingReceived: DataTypes.DECIMAL(18, 2), partnershipsEstablished: DataTypes.INTEGER,
    marketsEntered: DataTypes.INTEGER, keyMilestone: DataTypes.TEXT, biggestChallenge: DataTypes.TEXT,
    supportRequired: DataTypes.TEXT, comments: DataTypes.TEXT, submittedById: DataTypes.INTEGER,
    submittedAt: DataTypes.DATE, reviewedById: DataTypes.INTEGER, reviewedAt: DataTypes.DATE, reviewComments: DataTypes.TEXT,
  }, { sequelize, modelName: "MePeriodicReport", tableName: "me_periodic_reports" });
  return MePeriodicReport;
};
