"use strict";

// Coaching sessions move out of the Mentorship Tracker and into the programmes.
//
// A session was only creatable for a startup that already had a
// TrackerEnterprise row, which is grant-tracker data — so a startup enrolled in
// a programme but not tracked for grants could not be coached at all. Sessions
// now hang off the programme instead:
//
//   * cohortProgramId records which programme the session belongs to
//   * enterpriseId becomes nullable, since a coached startup need not be in
//     the grant tracker
//
// Existing sessions keep their enterpriseId and simply have no programme.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("TrackerSessions", "cohortProgramId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: { model: "cohort_programs", key: "id" },
      onUpdate: "CASCADE",
      // Deleting a programme must not delete its coaching history.
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("TrackerSessions", ["cohortProgramId"], {
      name: "tracker_sessions_cohort_program_idx",
    });

    await queryInterface.changeColumn("TrackerSessions", "enterpriseId", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Rows created against a programme have no enterprise, so they must go
    // before the column can be NOT NULL again.
    await queryInterface.sequelize.query(
      "DELETE FROM TrackerSessions WHERE enterpriseId IS NULL",
    );

    await queryInterface.changeColumn("TrackerSessions", "enterpriseId", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    await queryInterface.removeIndex(
      "TrackerSessions",
      "tracker_sessions_cohort_program_idx",
    );
    await queryInterface.removeColumn("TrackerSessions", "cohortProgramId");
  },
};
