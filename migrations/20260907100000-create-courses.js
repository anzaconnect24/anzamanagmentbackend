"use strict";

// A course sits between a programme and its content:
//
//   Programme -> Course -> Modules / Workshops / Resources
//
// Startups enrol in a course rather than in the programme as a whole, so one
// programme can run several distinct courses with their own rosters.
//
// Everything already in a programme is moved onto one course per programme, so
// no module, workshop, resource or enrolment is orphaned.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("courses", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      cohortProgramId: { type: Sequelize.INTEGER, allowNull: false },
      title: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      image: { type: Sequelize.STRING, allowNull: true },
      // What the learner should be able to do by the end.
      objectives: { type: Sequelize.TEXT, allowNull: true },
      estimatedHours: { type: Sequelize.INTEGER, allowNull: true },
      startDate: { type: Sequelize.DATEONLY, allowNull: true },
      endDate: { type: Sequelize.DATEONLY, allowNull: true },
      // Draft courses are invisible to learners.
      status: {
        type: Sequelize.ENUM("draft", "published", "archived"),
        allowNull: false,
        defaultValue: "published",
      },
      // Whether a startup on the programme may enrol themselves, or whether
      // staff put them on it.
      selfEnroll: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdById: { type: Sequelize.INTEGER, allowNull: true },
      archivedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex("courses", ["cohortProgramId"], {
      name: "courses_program",
    });

    // Everything that used to hang off the programme now hangs off a course.
    // Nullable so nothing existing breaks while it is being moved across.
    for (const table of [
      "Modules",
      "workshops",
      "learning_resources",
      "course_enrollments",
    ]) {
      await queryInterface.addColumn(table, "courseId", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });

      await queryInterface.addIndex(table, ["courseId"], {
        name: table.toLowerCase() + "_course",
      });
    }

    // --- move existing content onto one course per programme -------------

    const [programmes] = await queryInterface.sequelize.query(`
      SELECT DISTINCT p.id, p.title, p.description, p.image
      FROM cohort_programs p
      WHERE EXISTS (SELECT 1 FROM Modules m WHERE m.cohortProgramId = p.id)
         OR EXISTS (SELECT 1 FROM workshops w WHERE w.cohortProgramId = p.id)
         OR EXISTS (SELECT 1 FROM learning_resources r WHERE r.cohortProgramId = p.id)
         OR EXISTS (SELECT 1 FROM course_enrollments e WHERE e.cohortProgramId = p.id)
    `);

    for (const programme of programmes) {
      const [courseId] = await queryInterface.sequelize.query(
        `INSERT INTO courses
           (uuid, cohortProgramId, title, description, image, status, selfEnroll, required, position, createdAt, updatedAt)
         VALUES (UUID(), :programmeId, :title, :description, :image, 'published', true, true, 0, NOW(), NOW())`,
        {
          replacements: {
            programmeId: programme.id,
            title: programme.title || "Course 1",
            description: programme.description || null,
            image: programme.image || null,
          },
        },
      );

      for (const table of [
        "Modules",
        "workshops",
        "learning_resources",
        "course_enrollments",
      ]) {
        await queryInterface.sequelize.query(
          `UPDATE ${table} SET courseId = :courseId
           WHERE cohortProgramId = :programmeId AND courseId IS NULL`,
          { replacements: { courseId, programmeId: programme.id } },
        );
      }
    }

    // A startup enrols once per course, not once per programme.
    await queryInterface.removeIndex(
      "course_enrollments",
      "course_enrollments_unique",
    );

    await queryInterface.addIndex(
      "course_enrollments",
      ["courseId", "businessId"],
      { name: "course_enrollments_unique", unique: true },
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "course_enrollments",
      "course_enrollments_unique",
    );

    await queryInterface.addIndex(
      "course_enrollments",
      ["cohortProgramId", "businessId"],
      { name: "course_enrollments_unique", unique: true },
    );

    for (const table of [
      "Modules",
      "workshops",
      "learning_resources",
      "course_enrollments",
    ]) {
      await queryInterface.removeIndex(table, table.toLowerCase() + "_course");
      await queryInterface.removeColumn(table, "courseId");
    }

    await queryInterface.dropTable("courses");
  },
};
