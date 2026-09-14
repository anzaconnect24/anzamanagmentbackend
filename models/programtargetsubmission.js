"use strict";
const { Model } = require("sequelize");

// One startup's line against one programme milestone or KPI.
module.exports = (sequelize, DataTypes) => {
  class ProgramTargetSubmission extends Model {
    static associate(models) {
      ProgramTargetSubmission.belongsTo(models.ProgramTarget, {
        foreignKey: "targetId",
        as: "target",
      });
      ProgramTargetSubmission.belongsTo(models.Business, {
        foreignKey: "businessId",
      });
    }
  }

  ProgramTargetSubmission.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      targetId: { type: DataTypes.INTEGER, allowNull: false },
      businessId: { type: DataTypes.INTEGER, allowNull: false },
      value: DataTypes.STRING,
      completionStatus: DataTypes.STRING(30),
      narrative: DataTypes.TEXT,
      evidenceUrls: DataTypes.TEXT,
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "draft" },
      submittedById: DataTypes.INTEGER,
      submittedAt: DataTypes.DATE,
      reviewedById: DataTypes.INTEGER,
      reviewedAt: DataTypes.DATE,
      reviewNotes: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "ProgramTargetSubmission",
      tableName: "program_target_submissions",
      indexes: [
        {
          name: "program_target_submissions_target_business",
          unique: true,
          fields: ["targetId", "businessId"],
        },
      ],
    },
  );

  return ProgramTargetSubmission;
};
