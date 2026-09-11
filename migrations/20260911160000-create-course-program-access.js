"use strict";

// Lets one course be offered to several programmes. Course.cohortProgramId
// stays the course's home programme; these rows are the additional ones it is
// visible to, so nothing that reads the home programme today has to change.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("course_program_access", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
      },
      courseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "courses", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      cohortProgramId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "cohort_programs", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    // A course is either visible to a programme or it is not; the same pair
    // twice would double every course in that programme's listing.
    await queryInterface.addIndex("course_program_access", ["courseId", "cohortProgramId"], {
      unique: true,
      name: "course_program_access_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("course_program_access");
  },
};
