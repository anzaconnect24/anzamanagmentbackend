"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CratReview extends Model {
    static associate(models) {
      // Define associations here
      CratReview.belongsTo(models.User, {
        foreignKey: "entrepreneur_id",
        as: "entrepreneur",
      });

      CratReview.belongsTo(models.User, {
        foreignKey: "reviewer_id",
        as: "reviewer",
      });
    }
  }

  CratReview.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      entrepreneur_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true, // One-to-one relationship
      },
      reviewer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "assigned",
          "in_review",
          "reviewed",
          "accepted",
          "rejected",
        ),
        defaultValue: "pending",
        allowNull: false,
      },
      reviewer_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      admin_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      submitted_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      assigned_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      finalized_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CratReview",
      tableName: "crat_reviews",
    },
  );

  return CratReview;
};
