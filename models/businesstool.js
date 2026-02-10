"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BusinessTool extends Model {
    static associate(models) {
      // Add associations if needed in the future
    }
  }

  BusinessTool.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      fileName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      fileUrl: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fileType: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "word, excel, ppt, pdf",
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "File size in bytes",
      },
    },
    {
      sequelize,
      modelName: "BusinessTool",
      tableName: "business_tools",
    },
  );

  return BusinessTool;
};
