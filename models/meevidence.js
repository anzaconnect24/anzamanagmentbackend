"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class MeEvidence extends Model { static associate(models) { MeEvidence.belongsTo(models.Business, { foreignKey: "businessId" }); MeEvidence.belongsTo(models.CohortProgram, { foreignKey: "cohortProgramId" }); } }
  MeEvidence.init({
    uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true }, cohortProgramId: DataTypes.INTEGER,
    businessId: DataTypes.INTEGER, entityType: { type: DataTypes.STRING, allowNull: false }, entityUuid: { type: DataTypes.UUID, allowNull: false },
    evidenceType: { type: DataTypes.STRING, allowNull: false }, fileUrl: { type: DataTypes.TEXT, allowNull: false }, description: DataTypes.TEXT,
    storageKey: DataTypes.STRING,
    verificationStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" }, uploadedById: DataTypes.INTEGER,
    verifiedById: DataTypes.INTEGER, verifiedAt: DataTypes.DATE, rejectionReason: DataTypes.TEXT,
  }, { sequelize, modelName: "MeEvidence", tableName: "me_evidence" });
  return MeEvidence;
};
