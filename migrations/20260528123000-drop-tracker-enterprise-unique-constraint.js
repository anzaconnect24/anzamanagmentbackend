"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeConstraint(
      "TrackerEnterprises",
      "tracker_enterprise_unique_mentor_entrepreneur",
    );
  },

  async down(queryInterface) {
    await queryInterface.addConstraint("TrackerEnterprises", {
      type: "unique",
      fields: ["mentorId", "entreprenuerId"],
      name: "tracker_enterprise_unique_mentor_entrepreneur",
    });
  },
};
