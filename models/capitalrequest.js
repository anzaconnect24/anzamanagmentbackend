"use strict";
const { Model } = require("sequelize");
const { jsonColumn } = require("../utils/json_column");

// An enterprise asking for capital. It lands in the Capital Facilitation
// Manager's review queue first, and one request can become several
// opportunities - one per capital provider it is introduced to.
module.exports = (sequelize, DataTypes) => {
  class CapitalRequest extends Model {
    static associate(models) {
      CapitalRequest.belongsTo(models.Business, { foreignKey: "businessId" });
      CapitalRequest.belongsTo(models.User, { foreignKey: "userId", as: "leader" });
      CapitalRequest.belongsTo(models.User, { foreignKey: "assignedManagerId", as: "assignedManager" });
      CapitalRequest.belongsTo(models.User, { foreignKey: "reviewedById", as: "reviewer" });
      CapitalRequest.belongsTo(models.CohortProgram, { foreignKey: "cohortProgramId" });
      CapitalRequest.hasMany(models.CapitalOpportunity, {
        foreignKey: "capitalRequestId",
        as: "opportunities",
      });
      CapitalRequest.hasMany(models.CapitalDocument, {
        foreignKey: "capitalRequestId",
        as: "documents",
      });
    }
  }

  CapitalRequest.FINANCING_TYPES = [
    "grant",
    "debt",
    "equity",
    "convertible",
    "revenue_based",
    "working_capital",
    "asset_finance",
    "catalytic",
    "blended",
    "guarantee",
    "other",
  ];

  CapitalRequest.STATUSES = [
    "draft",
    "submitted",
    "under_review",
    "more_information_required",
    "approved_for_matching",
    "matching_in_progress",
    "capital_provider_identified",
    "introduction_pending",
    "introduction_approved",
    "capital_provider_engaged",
    "due_diligence",
    "negotiation",
    "commitment_secured",
    "partially_funded",
    "fully_funded",
    "disbursed",
    "declined",
    "on_hold",
    "closed",
  ];

  // Waiting on the manager, as the dashboard counts them.
  CapitalRequest.AWAITING_REVIEW = ["submitted", "under_review", "more_information_required"];

  CapitalRequest.READINESS = ["not_assessed", "not_ready", "emerging", "ready", "investment_ready"];

  CapitalRequest.init(
    {
      uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false },
      reference: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      businessId: { type: DataTypes.INTEGER, allowNull: false },
      userId: DataTypes.INTEGER,
      cohortProgramId: DataTypes.INTEGER,
      legacyRequestId: DataTypes.INTEGER,
      amountRequested: DataTypes.DECIMAL(16, 2),
      currency: { type: DataTypes.STRING(8), allowNull: false, defaultValue: "USD" },
      amountUsd: DataTypes.DECIMAL(16, 2),
      financingType: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "other" },
      purpose: DataTypes.TEXT,
      preferredProviderTypes: jsonColumn(DataTypes, "preferredProviderTypes", []),
      currentRevenue: DataTypes.DECIMAL(16, 2),
      revenueCurrency: DataTypes.STRING(8),
      traction: DataTypes.TEXT,
      readinessStatus: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "not_assessed" },
      founderGender: DataTypes.STRING(20),
      youthLed: DataTypes.BOOLEAN,
      status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "submitted" },
      assignedManagerId: DataTypes.INTEGER,
      submittedAt: DataTypes.DATE,
      reviewedAt: DataTypes.DATE,
      reviewedById: DataTypes.INTEGER,
      infoRequest: DataTypes.TEXT,
      recommendations: DataTypes.TEXT,
      declineReason: DataTypes.TEXT,
    },
    { sequelize, modelName: "CapitalRequest", tableName: "capital_requests" },
  );

  return CapitalRequest;
};
