"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AiReport extends Model {
    static associate(models) {
      AiReport.belongsTo(models.User, {
        foreignKey: "userId",
        as: "User",
      });
      AiReport.belongsTo(models.Business, {
        foreignKey: "businessId",
        as: "Business",
      });
    }
  }

  AiReport.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      businessId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      reportType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "crat_analysis",
      },
      businessInfo: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      assessmentData: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      aiAnalysis: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "AiReport",
      tableName: "ai_reports",
      timestamps: true,
    },
  );

  return AiReport;
};
