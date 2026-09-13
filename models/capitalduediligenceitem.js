"use strict";
const { Model } = require("sequelize");

// One line of an opportunity's due diligence checklist.
module.exports = (sequelize, DataTypes) => {
  class CapitalDdItem extends Model {
    static associate(models) {
      CapitalDdItem.belongsTo(models.CapitalOpportunity, { foreignKey: "capitalOpportunityId" });
      CapitalDdItem.belongsTo(models.CapitalDocument, { foreignKey: "capitalDocumentId", as: "document" });
      CapitalDdItem.belongsTo(models.User, { foreignKey: "reviewerId", as: "reviewer" });
    }
  }

  CapitalDdItem.CATEGORIES = [
    "business",
    "financial",
    "legal",
    "tax",
    "governance",
    "management",
    "market",
    "operations",
    "impact",
    "esg",
    "compliance",
    "financing_readiness",
  ];

  CapitalDdItem.STATUSES = [
    "not_started",
    "requested",
    "submitted",
    "under_review",
    "verified",
    "issue_identified",
    "resolved",
    "not_applicable",
  ];

  // Finished, for completion and overdue counting.
  CapitalDdItem.DONE = ["verified", "resolved", "not_applicable"];

  CapitalDdItem.PARTIES = ["enterprise", "provider", "anza"];
  CapitalDdItem.RISKS = ["low", "medium", "high", "critical"];

  CapitalDdItem.init(
    {
      uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false },
      capitalOpportunityId: { type: DataTypes.INTEGER, allowNull: false },
      category: { type: DataTypes.STRING(40), allowNull: false },
      requirement: { type: DataTypes.TEXT, allowNull: false },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "not_started" },
      responsibleParty: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "enterprise" },
      capitalDocumentId: DataTypes.INTEGER,
      reviewerId: DataTypes.INTEGER,
      comments: DataTypes.TEXT,
      riskLevel: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "low" },
      dueDate: DataTypes.DATEONLY,
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { sequelize, modelName: "CapitalDdItem", tableName: "capital_dd_items" },
  );

  return CapitalDdItem;
};
