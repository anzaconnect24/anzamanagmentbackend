"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MeAssessment extends Model {
    static associate(models) {
      MeAssessment.belongsTo(models.CohortProgram, { foreignKey: "cohortProgramId" });
      MeAssessment.belongsTo(models.CohortMembership, { foreignKey: "cohortMembershipId" });
      MeAssessment.belongsTo(models.Business, { foreignKey: "businessId" });
      MeAssessment.belongsTo(models.MeAssessmentTemplate, { foreignKey: "templateId", as: "Template" });
    }
  }
  MeAssessment.init({
    uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
    cohortProgramId: { type: DataTypes.INTEGER, allowNull: false },
    cohortMembershipId: { type: DataTypes.INTEGER, allowNull: true },
    businessId: { type: DataTypes.INTEGER, allowNull: false },
    templateId: DataTypes.INTEGER,
    assessorId: DataTypes.INTEGER,
    assessmentType: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [["baseline", "midline", "endline", "custom"]] } },
    assessmentDate: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "draft", validate: { isIn: [["draft", "submitted", "under_review", "verified", "rejected"]] } },
    performanceMetrics: DataTypes.JSON,
    capabilityScores: DataTypes.JSON,
    answers: DataTypes.JSON,
    notes: DataTypes.TEXT,
    submittedAt: DataTypes.DATE,
    verifiedById: DataTypes.INTEGER,
    verifiedAt: DataTypes.DATE,
    reviewComments: DataTypes.TEXT,
  }, { sequelize, modelName: "MeAssessment", tableName: "me_assessments" });
  return MeAssessment;
};
