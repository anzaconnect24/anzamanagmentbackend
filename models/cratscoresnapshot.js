"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CratScoreSnapshot extends Model {
    static associate(models) {
      CratScoreSnapshot.belongsTo(models.CratAssessment, {
        foreignKey: "assessment_id",
      });
      CratScoreSnapshot.belongsTo(models.User, {
        foreignKey: "generated_by",
        as: "generator",
      });
    }
  }

  CratScoreSnapshot.init(
    {
      assessment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      domain_scores_json: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
      },
      overall_score_5: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: false,
      },
      overall_percent: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: false,
      },
      incomplete: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      generated_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      generated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "CratScoreSnapshot",
      tableName: "crat_score_snapshots",
      updatedAt: false,
      createdAt: true,
    },
  );

  return CratScoreSnapshot;
};
