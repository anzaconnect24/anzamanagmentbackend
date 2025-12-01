"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("QuizQuestions", {
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
        comment: "Display order of question",
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
    await queryInterface.dropTable("QuizQuestions");
  },
};
