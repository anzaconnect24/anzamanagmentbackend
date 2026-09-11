"use strict";

// Coaching oversight for the Program Lead.
//
// Assignment already existed: cohort_memberships carries assignedMentorId and
// assignedAdvisorId, and TrackerSessions carry the notes and action items. Two
// things were missing.
//
// 1. supportAreas - what the coach and the enterprise agreed to work on. It
//    belongs on the membership, not the session: it is the standing agreement
//    for this enterprise on this programme, and each session is one visit
//    against it.
//
// 2. confidential - a coach records things an enterprise says in confidence.
//    Marking a session confidential keeps its private notes to the coach who
//    wrote them and Admin; everyone else still sees the session happened, its
//    agreed actions and its RAG flag, but not the notes.
module.exports = {
  async up(queryInterface, Sequelize) {
    const memberships = await queryInterface.describeTable("cohort_memberships");

    if (!memberships.supportAreas) {
      await queryInterface.addColumn("cohort_memberships", "supportAreas", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    const sessions = await queryInterface.describeTable("TrackerSessions");

    if (!sessions.confidential) {
      await queryInterface.addColumn("TrackerSessions", "confidential", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface
      .removeColumn("cohort_memberships", "supportAreas")
      .catch(() => {});
    await queryInterface
      .removeColumn("TrackerSessions", "confidential")
      .catch(() => {});
  },
};
