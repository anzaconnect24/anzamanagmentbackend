"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("QuizAttempts", "gradingStatus", {
      type: Sequelize.ENUM("auto_graded", "pending_grading", "graded"),
      allowNull: false,
      defaultValue: "auto_graded",
    });

    await queryInterface.addColumn("QuizAttempts", "gradedBy", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
    });

    await queryInterface.addColumn("QuizAttempts", "gradedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("QuizAttempts", "gradingStatus");
    await queryInterface.removeColumn("QuizAttempts", "gradedBy");
    await queryInterface.removeColumn("QuizAttempts", "gradedAt");
  },
};
