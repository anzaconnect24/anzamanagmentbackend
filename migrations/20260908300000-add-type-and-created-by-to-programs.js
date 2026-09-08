"use strict";

// Restores two Programs columns the models rely on but no migration creates.
//
//   type         - what kind of row this is: "program" (a learn-and-grow
//                  course), "grant" or "mentorship". program.controller reads
//                  it to filter listings and writes "program" when the client
//                  omits it, and the cohort refactor deleted its rows with
//                  `WHERE type = 'cohort'`. models/program.js declares it
//                  NOT NULL, so a row cannot be written without it.
//   createdById  - who created the course, shown as the lead instructor.
//
// Both existed in the environment the feature branch was written against but
// were never committed as a migration, so a database built purely from
// migrations is missing them and every Programs query fails with
// "Unknown column 'type' in 'field list'".
//
// Guarded on column existence: environments that already picked the columns up
// out of band skip them rather than failing on a duplicate column.
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("Programs");

    if (!table.type) {
      // Existing rows are all courses - the cohort rows were moved to
      // cohort_programs and deleted - so the default is right for them.
      await queryInterface.addColumn("Programs", "type", {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "program",
      });
    }

    if (!table.createdById) {
      await queryInterface.addColumn("Programs", "createdById", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("Programs");

    if (table.createdById) {
      await queryInterface.removeColumn("Programs", "createdById");
    }

    if (table.type) {
      await queryInterface.removeColumn("Programs", "type");
    }
  },
};
