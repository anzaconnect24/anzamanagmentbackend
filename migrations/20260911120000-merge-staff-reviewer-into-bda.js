"use strict";

// "Staff" and "Reviewer" were always the same person: the client offered one
// "Staff" option at sign-up but stored it as "Reviewer", and every role check
// in the app had to accept both. They are now the single role "BDA"
// (Business Development Advisor).
//
// down() cannot tell which of the two an account originally held, so it
// restores them all as "Reviewer" - the value the sign-up form actually wrote.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      "UPDATE Users SET role = 'BDA' WHERE role IN ('Staff', 'Reviewer')",
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "UPDATE Users SET role = 'Reviewer' WHERE role = 'BDA'",
    );
  },
};
