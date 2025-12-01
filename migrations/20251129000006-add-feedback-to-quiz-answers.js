"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.addColumn("QuizAnswers", "feedback", {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Admin feedback for description answers",
    });
  },
  async down(queryInterface, DataTypes) {
    await queryInterface.removeColumn("QuizAnswers", "feedback");
  },
};
