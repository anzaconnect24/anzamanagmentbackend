"use strict";

// A coaching session's own name, e.g. "Q3 cash-flow review".
//
// The session history panel already renders `title || sessionType`, so the
// field was expected on the client but had no column behind it — every session
// fell back to its type. Nullable, since existing sessions have no title.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("TrackerSessions", "title", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("TrackerSessions", "title");
  },
};
