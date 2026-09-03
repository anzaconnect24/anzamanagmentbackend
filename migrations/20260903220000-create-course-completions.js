"use strict";

// Which classes a startup has finished.
//
// Enrolment lives in Firestore and only records that a startup *started* a
// course; nothing recorded completion anywhere, so the Courses column on the
// Startup Portfolio had no source. This is that record.
//
// Keyed on the business rather than the user, so it follows the startup the
// same way its programme membership does.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("course_completions", {
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
      businessId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Businesses", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      // The class (a learn-and-grow course in Programs).
      courseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Programs", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // A course is either finished or not — never finished twice.
    await queryInterface.addConstraint("course_completions", {
      fields: ["businessId", "courseId"],
      type: "unique",
      name: "course_completions_unique_pair",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("course_completions");
  },
};
