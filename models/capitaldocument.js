"use strict";
const { Model } = require("sequelize");

// A file attached to a capital request or opportunity, or kept in a deal room.
//
// The file is stored outside the public /files folder and is only ever served
// through an authenticated download that checks `visibility` and writes the
// access to the audit trail. A replacement is a new row that points at the one
// it replaces, so earlier versions stay on record; a deletion is soft.
module.exports = (sequelize, DataTypes) => {
  class CapitalDocument extends Model {
    static associate(models) {
      CapitalDocument.belongsTo(models.CapitalRequest, { foreignKey: "capitalRequestId" });
      CapitalDocument.belongsTo(models.CapitalOpportunity, { foreignKey: "capitalOpportunityId" });
      CapitalDocument.belongsTo(models.CapitalDealRoom, { foreignKey: "capitalDealRoomId" });
      CapitalDocument.belongsTo(models.User, { foreignKey: "uploadedById", as: "uploadedBy" });
    }
  }

  CapitalDocument.CATEGORIES = [
    "pitch_deck",
    "business_plan",
    "financial_statements",
    "management_accounts",
    "financial_model",
    "legal_documents",
    "registration_documents",
    "tax_documents",
    "shareholding_information",
    "governance_documents",
    "impact_information",
    "esg_information",
    "due_diligence_documents",
    "term_sheet",
    "investment_agreement",
    "loan_agreement",
    "grant_agreement",
    "commitment_letter",
    "signed_agreement",
    "investor_confirmation",
    "bank_confirmation",
    "disbursement_evidence",
    "other",
  ];

  // Categories the privacy rules treat as sensitive: never released to a
  // capital provider without an explicit visibility grant.
  CapitalDocument.SENSITIVE = [
    "financial_statements",
    "management_accounts",
    "financial_model",
    "legal_documents",
    "tax_documents",
    "shareholding_information",
    "term_sheet",
    "investment_agreement",
    "loan_agreement",
  ];

  // internal    - Anza staff only
  // provider    - the capital provider on the opportunity can view
  // enterprise  - the enterprise can view
  // both        - both parties can view
  // restricted  - only the Capital Facilitation Manager
  CapitalDocument.VISIBILITIES = ["internal", "provider", "enterprise", "both", "restricted"];

  CapitalDocument.init(
    {
      uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false },
      capitalRequestId: DataTypes.INTEGER,
      capitalOpportunityId: DataTypes.INTEGER,
      capitalDealRoomId: DataTypes.INTEGER,
      businessId: DataTypes.INTEGER,
      category: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "other" },
      title: { type: DataTypes.STRING, allowNull: false },
      originalName: { type: DataTypes.STRING, allowNull: false },
      storedName: { type: DataTypes.STRING, allowNull: false },
      mimeType: DataTypes.STRING(120),
      sizeBytes: DataTypes.INTEGER,
      visibility: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "internal" },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      replacesDocumentId: DataTypes.INTEGER,
      uploadedById: DataTypes.INTEGER,
      deletedAt: DataTypes.DATE,
      deletedById: DataTypes.INTEGER,
    },
    { sequelize, modelName: "CapitalDocument", tableName: "capital_documents" },
  );

  return CapitalDocument;
};
