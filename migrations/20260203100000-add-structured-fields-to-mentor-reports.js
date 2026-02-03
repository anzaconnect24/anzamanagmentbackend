"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("MentorReports", "sessionOverview", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("MentorReports", "menteeEngagementRating", {
      type: Sequelize.ENUM("excellent", "good", "fair", "needs-improvement"),
      allowNull: true,
    });

    await queryInterface.addColumn(
      "MentorReports",
      "menteeEngagementComments",
      {
        type: Sequelize.TEXT,
        allowNull: true,
      },
    );

    await queryInterface.addColumn("MentorReports", "significantProgress", {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    });

    await queryInterface.addColumn("MentorReports", "progressDetails", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("MentorReports", "areasForImprovement", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("MentorReports", "nextSteps", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("MentorReports", "supportNeeded", {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    });

    await queryInterface.addColumn("MentorReports", "supportDetails", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("MentorReports", "overallFeedback", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("MentorReports", "sessionRating", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("MentorReports", "sessionOverview");
    await queryInterface.removeColumn(
      "MentorReports",
      "menteeEngagementRating",
    );
    await queryInterface.removeColumn(
      "MentorReports",
      "menteeEngagementComments",
    );
    await queryInterface.removeColumn("MentorReports", "significantProgress");
    await queryInterface.removeColumn("MentorReports", "progressDetails");
    await queryInterface.removeColumn("MentorReports", "areasForImprovement");
    await queryInterface.removeColumn("MentorReports", "nextSteps");
    await queryInterface.removeColumn("MentorReports", "supportNeeded");
    await queryInterface.removeColumn("MentorReports", "supportDetails");
    await queryInterface.removeColumn("MentorReports", "overallFeedback");
    await queryInterface.removeColumn("MentorReports", "sessionRating");
  },
};
