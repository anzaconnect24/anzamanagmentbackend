"use strict";

// Which programme cohorts may open a class.
//
// A "class" is a learn-and-grow course — a row in Programs with no tracker
// type — and its modules and slides hang off it. Gating the course therefore
// gates its learning materials.
//
// A course with NO rows here stays open to everyone, so existing courses keep
// working exactly as they do today. Adding a row is what restricts it.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("class_program_access", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true,
      },
      // The class (learn-and-grow course).
      courseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Programs", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      // The programme cohort granted access.
      cohortProgramId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "cohort_programs", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addConstraint("class_program_access", {
      fields: ["courseId", "cohortProgramId"],
      type: "unique",
      name: "class_program_access_unique_pair",
    });

    await queryInterface.addIndex("class_program_access", ["cohortProgramId"], {
      name: "class_program_access_cohort_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("class_program_access");
  },
};
