"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class QuizAttempt extends Model {
    static associate(models) {
      QuizAttempt.belongsTo(models.Quiz, {
        foreignKey: "quizId",
        as: "quiz",
      });
      QuizAttempt.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
      });
      QuizAttempt.hasMany(models.QuizAnswer, {
        foreignKey: "attemptId",
        as: "answers",
      });
    }
  }
  QuizAttempt.init(
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
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      totalPoints: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      earnedPoints: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      isPassed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      submittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "QuizAttempt",
      tableName: "QuizAttempts",
    }
  );
  return QuizAttempt;
};
