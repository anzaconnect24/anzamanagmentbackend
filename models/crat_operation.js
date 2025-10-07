"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CratOperations extends Model {
    static associate(models) {
      CratOperations.hasMany(models.Attachment, { onDelete: "cascade" });
    }
  }
  CratOperations.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      subDomain: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      score: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      attachment: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      rating: {
        type: DataTypes.ENUM("Yes", "No", "Maybe"),
        allowNull: false,
      },
      reviewer_comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reviewer: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reviewCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      customerComment: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      adminComment: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      reviewerComment: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CratOperations",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );
  return CratOperations;
};
