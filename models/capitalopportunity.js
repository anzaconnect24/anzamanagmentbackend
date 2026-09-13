"use strict";
const { Model } = require("sequelize");
const { jsonColumn } = require("../utils/json_column");

// One enterprise and one capital provider, from matching to disbursement.
// Everything capital-related - introductions, conversations, the deal room,
// due diligence, interventions and the outcome - hangs off this record, which
// is what lets Anza count what it facilitated without double counting.
module.exports = (sequelize, DataTypes) => {
  class CapitalOpportunity extends Model {
    static associate(models) {
      CapitalOpportunity.belongsTo(models.CapitalRequest, { foreignKey: "capitalRequestId" });
      CapitalOpportunity.belongsTo(models.CapitalProvider, { foreignKey: "capitalProviderId" });
      CapitalOpportunity.belongsTo(models.Business, { foreignKey: "businessId" });
      CapitalOpportunity.belongsTo(models.User, { foreignKey: "assignedManagerId", as: "assignedManager" });
      CapitalOpportunity.hasMany(models.CapitalIntroduction, { foreignKey: "capitalOpportunityId", as: "introductions" });
      CapitalOpportunity.hasMany(models.CapitalThread, { foreignKey: "capitalOpportunityId", as: "threads" });
      CapitalOpportunity.hasOne(models.CapitalDealRoom, { foreignKey: "capitalOpportunityId", as: "dealRoom" });
      CapitalOpportunity.hasMany(models.CapitalDocument, { foreignKey: "capitalOpportunityId", as: "documents" });
      CapitalOpportunity.hasMany(models.CapitalDdItem, { foreignKey: "capitalOpportunityId", as: "ddItems" });
      CapitalOpportunity.hasMany(models.CapitalIntervention, { foreignKey: "capitalOpportunityId", as: "interventions" });
    }
  }

  // The pipeline, in order.
  CapitalOpportunity.STAGES = [
    "capital_request",
    "manager_review",
    "capital_ready",
    "matching",
    "introduction",
    "provider_interest",
    "initial_meeting",
    "due_diligence",
    "provider_review",
    "negotiation",
    "term_sheet",
    "commitment",
    "disbursement",
    "capital_secured",
    "post_financing",
  ];

  CapitalOpportunity.OUTCOMES = [
    "capital_secured",
    "partially_secured",
    "declined_by_provider",
    "withdrawn_by_enterprise",
    "not_capital_ready",
    "eligibility_not_met",
    "no_response",
    "application_unsuccessful",
    "other",
  ];

  // Outcomes that count as capital mobilised.
  CapitalOpportunity.SUCCESS = ["capital_secured", "partially_secured"];

  CapitalOpportunity.CONTRIBUTIONS = [
    "enterprise_identification",
    "investment_readiness",
    "financial_model",
    "pitch_preparation",
    "provider_matching",
    "introduction",
    "due_diligence_support",
    "negotiation_support",
    "documentation_support",
    "deal_structuring",
    "follow_up",
    "post_investment_support",
  ];

  // moderated -> monitored -> direct, as the relationship matures.
  CapitalOpportunity.MODES = ["moderated", "monitored", "direct"];

  CapitalOpportunity.init(
    {
      uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false },
      reference: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      capitalRequestId: { type: DataTypes.INTEGER, allowNull: false },
      capitalProviderId: { type: DataTypes.INTEGER, allowNull: false },
      businessId: { type: DataTypes.INTEGER, allowNull: false },
      stage: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "matching" },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "active" },
      probability: DataTypes.INTEGER,
      matchScore: DataTypes.INTEGER,
      matchBreakdown: jsonColumn(DataTypes, "matchBreakdown", null),
      matchExplanation: DataTypes.TEXT,
      potentialAmount: DataTypes.DECIMAL(16, 2),
      currency: { type: DataTypes.STRING(8), allowNull: false, defaultValue: "USD" },
      financingType: DataTypes.STRING(40),
      assignedManagerId: DataTypes.INTEGER,
      nextAction: DataTypes.STRING,
      nextActionDate: DataTypes.DATEONLY,
      lastActivityAt: DataTypes.DATE,
      communicationMode: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "moderated" },
      communicationPaused: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      introductionApprovedAt: DataTypes.DATE,
      meetingAt: DataTypes.DATE,
      escalated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      flags: jsonColumn(DataTypes, "flags", []),
      outcome: DataTypes.STRING(40),
      amountApproved: DataTypes.DECIMAL(16, 2),
      amountCommitted: DataTypes.DECIMAL(16, 2),
      amountDisbursed: DataTypes.DECIMAL(16, 2),
      dateCommitted: DataTypes.DATEONLY,
      dateDisbursed: DataTypes.DATEONLY,
      financingTerms: DataTypes.TEXT,
      capitalSource: DataTypes.STRING,
      anzaContribution: jsonColumn(DataTypes, "anzaContribution", []),
      anzaContributionNotes: DataTypes.TEXT,
      closedAt: DataTypes.DATE,
      closedReason: DataTypes.TEXT,
    },
    { sequelize, modelName: "CapitalOpportunity", tableName: "capital_opportunities" },
  );

  return CapitalOpportunity;
};
