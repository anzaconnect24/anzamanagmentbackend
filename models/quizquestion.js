"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class QuizQuestion extends Model {
    static associate(models) {
      QuizQuestion.belongsTo(models.Quiz, {
        foreignKey: "quizId",
        as: "quiz",
      });
      QuizQuestion.hasMany(models.QuizOption, {
        foreignKey: "questionId",
        as: "options",
      });
      QuizQuestion.hasMany(models.QuizAnswer, {
        foreignKey: "questionId",
        as: "answers",
      });
    }
  }
  QuizQuestion.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
      },
      quizId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      questionText: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      questionType: {
        type: DataTypes.ENUM("multiple_choice", "true_false", "description"),
        allowNull: false,
      },
      points: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "QuizQuestion",
      tableName: "QuizQuestions",
    }
  );
  return QuizQuestion;
};
