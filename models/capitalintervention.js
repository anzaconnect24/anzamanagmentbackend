"use strict";
const { Model } = require("sequelize");

// The Capital Facilitation Manager stepping in on an opportunity. Every one is
// kept with its reason and the status it moved from and to, alongside the
// matching entry in the audit trail.
module.exports = (sequelize, DataTypes) => {
  class CapitalIntervention extends Model {
    static associate(models) {
      CapitalIntervention.belongsTo(models.CapitalOpportunity, { foreignKey: "capitalOpportunityId" });
      CapitalIntervention.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    }
  }

  CapitalIntervention.ACTIONS = [
    "request_enterprise_clarification",
    "request_provider_clarification",
    "stop_introduction",
    "pause_communication",
    "change_provider",
    "recommend_additional_providers",
    "request_updated_documents",
    "schedule_meeting",
    "escalate",
    "flag_compliance_concern",
    "flag_financing_risk",
    "flag_documentation_issue",
    "close_opportunity",
  ];

  CapitalIntervention.init(
    {
      uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false },
      capitalOpportunityId: { type: DataTypes.INTEGER, allowNull: false },
      action: { type: DataTypes.STRING(40), allowNull: false },
      reason: { type: DataTypes.TEXT, allowNull: false },
      comments: DataTypes.TEXT,
      previousStatus: DataTypes.STRING(60),
      newStatus: DataTypes.STRING(60),
      userId: DataTypes.INTEGER,
    },
    { sequelize, modelName: "CapitalIntervention", tableName: "capital_interventions" },
  );

  return CapitalIntervention;
};
