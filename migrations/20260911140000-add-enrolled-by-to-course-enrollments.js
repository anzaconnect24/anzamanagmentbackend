"use strict";

// A course's enrolment figure should count startups who enrolled themselves,
// not startups a staff roster or the programme-wide backfill created a
// learning record for. Nothing recorded which of those a row came from, so
// this adds it.
//
// Existing rows are left at the "staff" default on purpose: there is no
// signal in the data that separates a self-enrolment from an assignment
// after the fact (both paths write the business owner's userId), and the
// point of the change is to stop counting records the startup never opted
// into. Counts on existing courses will therefore drop to the startups who
// enrol from here on.
//
// To treat the existing rows as self-enrolments instead, run:
//   UPDATE course_enrollments SET enrolledBy = 'self';
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("course_enrollments");
    if (table.enrolledBy) return;

    await queryInterface.addColumn("course_enrollments", "enrolledBy", {
      type: Sequelize.ENUM("self", "staff"),
      allowNull: false,
      defaultValue: "staff",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("course_enrollments", "enrolledBy");
  },
};
