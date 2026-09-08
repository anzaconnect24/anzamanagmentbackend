"use strict";
const { Model } = require("sequelize");

// A reported figure for an indicator, carrying its own verification state.
// Automatic indicators are computed from platform records and never write
// here; this table holds what people report.
module.exports = (sequelize, DataTypes) => {
  class MeIndicatorValue extends Model {
    static associate(models) {
      MeIndicatorValue.belongsTo(models.MeIndicator, {
        foreignKey: "indicatorId",
        targetKey: "id",
      });
      MeIndicatorValue.belongsTo(models.Business, {
        foreignKey: "businessId",
        targetKey: "id",
      });
    }
  }

  MeIndicatorValue.VERIFICATION_STATUSES = [
    "reported",
    "evidence_submitted",
    "under_verification",
    "verified",
    "revision_required",
    "rejected",
  ];

  MeIndicatorValue.ORIGINS = [
    "manual",
    "enterprise_report",
    "survey",
    "system",
  ];

  MeIndicatorValue.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      indicatorId: { type: DataTypes.INTEGER, allowNull: false },
      periodId: { type: DataTypes.INTEGER, allowNull: true },
      businessId: { type: DataTypes.INTEGER, allowNull: true },
      value: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      narrative: { type: DataTypes.TEXT, allowNull: true },
      origin: {
        type: DataTypes.ENUM("manual", "enterprise_report", "survey", "system"),
        allowNull: false,
        defaultValue: "manual",
      },
      verificationStatus: {
        type: DataTypes.ENUM(
          "reported",
          "evidence_submitted",
          "under_verification",
          "verified",
          "revision_required",
          "rejected",
        ),
        allowNull: false,
        defaultValue: "reported",
      },
      verifiedValue: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      verifiedById: { type: DataTypes.INTEGER, allowNull: true },
      verifiedAt: { type: DataTypes.DATE, allowNull: true },
      reviewerComments: { type: DataTypes.TEXT, allowNull: true },
      submittedById: { type: DataTypes.INTEGER, allowNull: true },
      submittedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "MeIndicatorValue",
      tableName: "me_indicator_values",
    },
  );

  return MeIndicatorValue;
};
