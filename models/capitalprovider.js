"use strict";
const { Model } = require("sequelize");
const { jsonColumn } = require("../utils/json_column");

// Anyone who can finance an enterprise: an investor with a platform account,
// or a bank, fund, DFI or foundation that has none. Its contact details are
// confidential until an introduction to it has been approved.
module.exports = (sequelize, DataTypes) => {
  class CapitalProvider extends Model {
    static associate(models) {
      CapitalProvider.belongsTo(models.User, { foreignKey: "userId", as: "account" });
      CapitalProvider.hasMany(models.CapitalOpportunity, {
        foreignKey: "capitalProviderId",
        as: "opportunities",
      });
    }
  }

  CapitalProvider.TYPES = [
    "investor",
    "venture_capital",
    "impact_investor",
    "bank",
    "microfinance",
    "dfi",
    "foundation",
    "grant_provider",
    "government_fund",
    "corporate_fund",
    "angel",
    "family_office",
    "accelerator",
    "catalytic_capital",
    "blended_facility",
  ];

  CapitalProvider.APPETITES = ["high", "medium", "low", "paused"];

  // Never shown to an enterprise before an approved introduction.
  CapitalProvider.CONFIDENTIAL = ["contactName", "contactEmail", "contactPhone"];

  CapitalProvider.init(
    {
      uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      providerType: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "investor" },
      userId: DataTypes.INTEGER,
      investorProfileId: DataTypes.INTEGER,
      preferredSectors: jsonColumn(DataTypes, "preferredSectors", []),
      preferredGeographies: jsonColumn(DataTypes, "preferredGeographies", []),
      enterpriseStages: jsonColumn(DataTypes, "enterpriseStages", []),
      minTicketUsd: DataTypes.DECIMAL(16, 2),
      maxTicketUsd: DataTypes.DECIMAL(16, 2),
      instruments: jsonColumn(DataTypes, "instruments", []),
      impactThemes: jsonColumn(DataTypes, "impactThemes", []),
      esgRequirements: DataTypes.TEXT,
      genderPreference: DataTypes.STRING(30),
      youthPreference: DataTypes.BOOLEAN,
      minAnnualRevenueUsd: DataTypes.DECIMAL(16, 2),
      tractionRequirements: DataTypes.TEXT,
      eligibilityCriteria: DataTypes.TEXT,
      financingCriteria: DataTypes.TEXT,
      previousTransactions: DataTypes.TEXT,
      capitalAppetite: DataTypes.STRING(20),
      contactName: DataTypes.STRING,
      contactEmail: DataTypes.STRING,
      contactPhone: DataTypes.STRING,
      applicationWindowOpens: DataTypes.DATEONLY,
      applicationWindowCloses: DataTypes.DATEONLY,
      requiredDocuments: jsonColumn(DataTypes, "requiredDocuments", []),
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "active" },
      createdById: DataTypes.INTEGER,
    },
    { sequelize, modelName: "CapitalProvider", tableName: "capital_providers" },
  );

  return CapitalProvider;
};
