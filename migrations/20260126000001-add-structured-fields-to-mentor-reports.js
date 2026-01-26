"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.addColumn("MentorReports", "meetingDate", {
      type: DataTypes.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("MentorReports", "meetingDuration", {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("MentorReports", "topicsDiscussed", {
      type: DataTypes.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("MentorReports", "progressMade", {
      type: DataTypes.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("MentorReports", "challengesFaced", {
      type: DataTypes.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("MentorReports", "actionItems", {
      type: DataTypes.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("MentorReports", "nextMeetingDate", {
      type: DataTypes.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("MentorReports", "overallProgress", {
      type: DataTypes.ENUM(
        "excellent",
        "good",
        "satisfactory",
        "needs-improvement",
      ),
      allowNull: true,
    });

    await queryInterface.addColumn("MentorReports", "recommendations", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, DataTypes) {
    await queryInterface.removeColumn("MentorReports", "meetingDate");
    await queryInterface.removeColumn("MentorReports", "meetingDuration");
    await queryInterface.removeColumn("MentorReports", "topicsDiscussed");
    await queryInterface.removeColumn("MentorReports", "progressMade");
    await queryInterface.removeColumn("MentorReports", "challengesFaced");
    await queryInterface.removeColumn("MentorReports", "actionItems");
    await queryInterface.removeColumn("MentorReports", "nextMeetingDate");
    await queryInterface.removeColumn("MentorReports", "overallProgress");
    await queryInterface.removeColumn("MentorReports", "recommendations");
  },
};
