"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class QuizAnswer extends Model {
    static associate(models) {
      QuizAnswer.belongsTo(models.QuizAttempt, {
        foreignKey: "attemptId",
        as: "attempt",
      });
      QuizAnswer.belongsTo(models.QuizQuestion, {
        foreignKey: "questionId",
        as: "question",
      });
      QuizAnswer.belongsTo(models.QuizOption, {
        foreignKey: "optionId",
        as: "option",
      });
    }
  }
  QuizAnswer.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
      },
      attemptId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      questionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      optionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      answerText: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isCorrect: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      pointsEarned: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "QuizAnswer",
      tableName: "QuizAnswers",
    }
  );
  return QuizAnswer;
};
