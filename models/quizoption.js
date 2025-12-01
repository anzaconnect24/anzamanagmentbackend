"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class QuizOption extends Model {
    static associate(models) {
      QuizOption.belongsTo(models.QuizQuestion, {
        foreignKey: "questionId",
        as: "question",
      });
      QuizOption.hasMany(models.QuizAnswer, {
        foreignKey: "optionId",
        as: "answers",
      });
    }
  }
  QuizOption.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
      },
      questionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      optionText: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      isCorrect: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "QuizOption",
      tableName: "QuizOptions",
    }
  );
  return QuizOption;
};
