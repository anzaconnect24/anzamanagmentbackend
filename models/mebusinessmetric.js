"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class MeBusinessMetric extends Model { static associate(models) { MeBusinessMetric.belongsTo(models.Business, { foreignKey: "businessId" }); MeBusinessMetric.belongsTo(models.CohortProgram, { foreignKey: "cohortProgramId" }); MeBusinessMetric.belongsTo(models.MePeriodicReport, { foreignKey: "reportId" }); } }
  MeBusinessMetric.init({
    uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true }, cohortProgramId: DataTypes.INTEGER,
    businessId: { type: DataTypes.INTEGER, allowNull: false }, reportId: DataTypes.INTEGER, metricCode: { type: DataTypes.STRING, allowNull: false },
    reportingDate: { type: DataTypes.DATEONLY, allowNull: false }, numericValue: DataTypes.DECIMAL(18, 2), textValue: DataTypes.TEXT,
    unit: DataTypes.STRING, verificationStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" }, recordedById: DataTypes.INTEGER,
  }, { sequelize, modelName: "MeBusinessMetric", tableName: "me_business_metrics" });
  return MeBusinessMetric;
};
