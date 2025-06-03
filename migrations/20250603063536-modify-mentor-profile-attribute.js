"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.changeColumn("MentorProfiles", "mentorshipFocus", {
      type: DataTypes.JSON,
      allowNull: true,
    });
  },

  async down(queryInterface, DataTypes) {
    await queryInterface.changeColumn("MentorProfiles", "mentorshipFocus", {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    });
  },
};
