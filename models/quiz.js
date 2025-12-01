"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Quiz extends Model {
    static associate(models) {
      Quiz.belongsTo(models.Module, {
        foreignKey: "moduleId",
        as: "module",
      });
      Quiz.hasMany(models.QuizQuestion, {
        foreignKey: "quizId",
        as: "questions",
      });
      Quiz.hasMany(models.QuizAttempt, {
        foreignKey: "quizId",
        as: "attempts",
      });
    }
  }
  Quiz.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
      },
      moduleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isPublished: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      passingScore: {
        type: DataTypes.INTEGER,
        defaultValue: 70,
      },
    },
    {
      sequelize,
      modelName: "Quiz",
      tableName: "Quizzes",
    }
  );
  return Quiz;
};
