"use strict";
const { Model } = require("sequelize");

// A request for contact between an enterprise and a capital provider, in
// either direction. Neither side reaches the other directly: the request waits
// for the Capital Facilitation Manager to approve, edit, redirect or decline it.
// A provider asking for an enterprise's information also needs the
// enterprise's permission before anything is released.
module.exports = (sequelize, DataTypes) => {
  class CapitalIntroduction extends Model {
    static associate(models) {
      CapitalIntroduction.belongsTo(models.CapitalOpportunity, { foreignKey: "capitalOpportunityId" });
      CapitalIntroduction.belongsTo(models.CapitalRequest, { foreignKey: "capitalRequestId" });
      CapitalIntroduction.belongsTo(models.Business, { foreignKey: "businessId" });
      CapitalIntroduction.belongsTo(models.CapitalProvider, { foreignKey: "capitalProviderId" });
      CapitalIntroduction.belongsTo(models.User, { foreignKey: "requestedById", as: "requestedBy" });
      CapitalIntroduction.belongsTo(models.User, { foreignKey: "reviewedById", as: "reviewedBy" });
    }
  }

  CapitalIntroduction.INITIATORS = ["enterprise", "provider", "manager"];

  CapitalIntroduction.REQUEST_TYPES = [
    "introduction",
    "pitch_deck",
    "financial_information",
    "meeting",
    "due_diligence_documents",
    "business_plan",
    "financial_model",
    "additional_information",
  ];

  CapitalIntroduction.STATUSES = [
    "pending_review",
    "changes_requested",
    "clarification_requested",
    "awaiting_enterprise_permission",
    "permission_denied",
    "approved",
    "scheduled",
    "declined",
    "replaced",
  ];

  // Still needing the manager's decision.
  CapitalIntroduction.OPEN = ["pending_review", "changes_requested", "clarification_requested", "awaiting_enterprise_permission"];

  CapitalIntroduction.init(
    {
      uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false },
      capitalOpportunityId: DataTypes.INTEGER,
      capitalRequestId: DataTypes.INTEGER,
      businessId: { type: DataTypes.INTEGER, allowNull: false },
      capitalProviderId: { type: DataTypes.INTEGER, allowNull: false },
      initiatedBy: { type: DataTypes.STRING(20), allowNull: false },
      requestedById: DataTypes.INTEGER,
      requestType: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "introduction" },
      message: DataTypes.TEXT,
      editedMessage: DataTypes.TEXT,
      status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "pending_review" },
      enterprisePermission: DataTypes.STRING(20),
      reviewedById: DataTypes.INTEGER,
      reviewedAt: DataTypes.DATE,
      reviewNote: DataTypes.TEXT,
      scheduledAt: DataTypes.DATE,
      replacedByProviderId: DataTypes.INTEGER,
      legacyInterestId: DataTypes.INTEGER,
    },
    { sequelize, modelName: "CapitalIntroduction", tableName: "capital_introductions" },
  );

  return CapitalIntroduction;
};
