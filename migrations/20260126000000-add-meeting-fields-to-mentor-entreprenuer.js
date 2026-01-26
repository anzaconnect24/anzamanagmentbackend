"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.addColumn("MentorEntreprenuers", "googleMeetLink", {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("MentorEntreprenuers", "appointmentDate", {
      type: DataTypes.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("MentorEntreprenuers", "appointmentStatus", {
      type: DataTypes.ENUM("pending", "accepted", "rejected", "completed"),
      allowNull: true,
      defaultValue: "pending",
    });

    await queryInterface.addColumn("MentorEntreprenuers", "menteeAccepted", {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    });
  },

  async down(queryInterface, DataTypes) {
    await queryInterface.removeColumn("MentorEntreprenuers", "googleMeetLink");
    await queryInterface.removeColumn("MentorEntreprenuers", "appointmentDate");
    await queryInterface.removeColumn(
      "MentorEntreprenuers",
      "appointmentStatus",
    );
    await queryInterface.removeColumn("MentorEntreprenuers", "menteeAccepted");
  },
};
