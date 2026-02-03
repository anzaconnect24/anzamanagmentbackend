"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("MentorshipApplications", "googleMeetLink", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn(
      "MentorshipApplications",
      "appointmentDate",
      {
        type: Sequelize.DATE,
        allowNull: true,
      },
    );

    await queryInterface.addColumn(
      "MentorshipApplications",
      "appointmentStatus",
      {
        type: Sequelize.ENUM("pending", "accepted", "rejected", "completed"),
        allowNull: true,
        defaultValue: "pending",
      },
    );

    await queryInterface.addColumn("MentorshipApplications", "menteeAccepted", {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      "MentorshipApplications",
      "googleMeetLink",
    );
    await queryInterface.removeColumn(
      "MentorshipApplications",
      "appointmentDate",
    );
    await queryInterface.removeColumn(
      "MentorshipApplications",
      "appointmentStatus",
    );
    await queryInterface.removeColumn(
      "MentorshipApplications",
      "menteeAccepted",
    );
  },
};
