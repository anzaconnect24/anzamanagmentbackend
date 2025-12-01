"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("QuizAttempts", {
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
      quizId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Quizzes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: "Percentage score",
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
    await queryInterface.dropTable("QuizAttempts");
  },
};
