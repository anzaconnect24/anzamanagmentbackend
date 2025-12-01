"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("QuizAnswers", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
      },
      attemptId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "QuizAttempts",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      questionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "QuizQuestions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      optionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "QuizOptions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "For multiple choice and true/false",
      },
      answerText: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "For description questions",
      },
      isCorrect: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      pointsEarned: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    });
  },
  async down(queryInterface, DataTypes) {
    await queryInterface.dropTable("QuizAnswers");
  },
};
