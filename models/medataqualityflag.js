"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class MeDataQualityFlag extends Model {}
  MeDataQualityFlag.init({
    uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true }, cohortProgramId: DataTypes.INTEGER,
    businessId: DataTypes.INTEGER, entityType: { type: DataTypes.STRING, allowNull: false }, entityUuid: DataTypes.UUID,
    ruleCode: { type: DataTypes.STRING, allowNull: false }, severity: { type: DataTypes.STRING, allowNull: false, defaultValue: "warning" },
    message: { type: DataTypes.TEXT, allowNull: false }, status: { type: DataTypes.STRING, allowNull: false, defaultValue: "open" },
    detectedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }, resolvedById: DataTypes.INTEGER,
    resolvedAt: DataTypes.DATE, resolutionNotes: DataTypes.TEXT,
  }, { sequelize, modelName: "MeDataQualityFlag", tableName: "me_data_quality_flags" });
  return MeDataQualityFlag;
};
