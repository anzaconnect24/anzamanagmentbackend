"use strict";

// Learning, phase 3: workshops with attendance and recordings, learning
// enrolment records, and a reusable resource library.
//
// Enrolment deliberately does NOT restate who is on a programme — that is
// CohortMembership's job. These rows carry only the learning state layered on
// top: when they started, where they got to, whether they finished.
module.exports = {
  async up(queryInterface, Sequelize) {
    // ------------------------------------------------------------ workshops
    await queryInterface.createTable("workshops", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      cohortProgramId: { type: Sequelize.INTEGER, allowNull: false },
      // A workshop may belong to a module, or stand on its own.
      moduleId: { type: Sequelize.INTEGER, allowNull: true },
      title: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      objectives: { type: Sequelize.TEXT, allowNull: true },
      // A platform user where the facilitator has an account, otherwise just
      // their name, so an external facilitator can still be credited.
      facilitatorId: { type: Sequelize.INTEGER, allowNull: true },
      facilitatorName: { type: Sequelize.STRING, allowNull: true },
      startsAt: { type: Sequelize.DATE, allowNull: false },
      endsAt: { type: Sequelize.DATE, allowNull: true },
      deliveryMode: {
        type: Sequelize.ENUM("physical", "online", "hybrid", "recorded"),
        allowNull: false,
        defaultValue: "online",
      },
      venue: { type: Sequelize.STRING, allowNull: true },
      meetingLink: { type: Sequelize.STRING, allowNull: true },
      // How long before the start the Join button becomes live.
      joinWindowMinutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 15,
      },
      // Share of the workshop a learner must attend to count as present.
      attendanceThresholdPercent: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 75,
      },
      attendanceRequired: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      slides: { type: Sequelize.STRING, allowNull: true },
      materials: { type: Sequelize.JSON, allowNull: true },
      status: {
        type: Sequelize.ENUM("draft", "scheduled", "completed", "cancelled"),
        allowNull: false,
        defaultValue: "scheduled",
      },
      createdById: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex("workshops", ["cohortProgramId"], {
      name: "workshops_program",
    });
    await queryInterface.addIndex("workshops", ["moduleId"], {
      name: "workshops_module",
    });

    // ------------------------------------------------------- attendance
    await queryInterface.createTable("workshop_attendance", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      workshopId: { type: Sequelize.INTEGER, allowNull: false },
      businessId: { type: Sequelize.INTEGER, allowNull: true },
      userId: { type: Sequelize.INTEGER, allowNull: true },
      joinedAt: { type: Sequelize.DATE, allowNull: true },
      leftAt: { type: Sequelize.DATE, allowNull: true },
      minutes: { type: Sequelize.INTEGER, allowNull: true },
      status: {
        type: Sequelize.ENUM(
          "present",
          "partial",
          "absent",
          "excused",
          "late",
        ),
        allowNull: false,
        defaultValue: "absent",
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      // Null when the platform worked the status out from the join/leave
      // times rather than a person setting it.
      recordedById: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    // One attendance row per enterprise per workshop.
    await queryInterface.addIndex(
      "workshop_attendance",
      ["workshopId", "businessId"],
      { name: "workshop_attendance_unique", unique: true },
    );

    // -------------------------------------------------------- recordings
    await queryInterface.createTable("workshop_recordings", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      workshopId: { type: Sequelize.INTEGER, allowNull: false },
      title: { type: Sequelize.STRING, allowNull: false },
      // An uploaded file or a provider URL; only the reference lives here.
      file: { type: Sequelize.STRING, allowNull: true },
      url: { type: Sequelize.STRING, allowNull: true },
      durationSeconds: { type: Sequelize.INTEGER, allowNull: true },
      thumbnail: { type: Sequelize.STRING, allowNull: true },
      // Who may watch it back.
      access: {
        type: Sequelize.ENUM("programme", "attendees", "staff"),
        allowNull: false,
        defaultValue: "programme",
      },
      // The lesson content item created from this recording, if it was
      // published into a course. The media itself is never copied.
      slideId: { type: Sequelize.INTEGER, allowNull: true },
      createdById: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex("workshop_recordings", ["workshopId"], {
      name: "workshop_recordings_workshop",
    });

    // ------------------------------------------------------- enrolments
    await queryInterface.createTable("course_enrollments", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      cohortProgramId: { type: Sequelize.INTEGER, allowNull: false },
      businessId: { type: Sequelize.INTEGER, allowNull: false },
      userId: { type: Sequelize.INTEGER, allowNull: true },
      enrolledAt: { type: Sequelize.DATE, allowNull: true },
      startedAt: { type: Sequelize.DATE, allowNull: true },
      completedAt: { type: Sequelize.DATE, allowNull: true },
      dueAt: { type: Sequelize.DATE, allowNull: true },
      // Recomputed from lesson progress whenever the roster is read.
      progressPercent: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM(
          "not_started",
          "in_progress",
          "completed",
          "overdue",
          "archived",
        ),
        allowNull: false,
        defaultValue: "not_started",
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex(
      "course_enrollments",
      ["cohortProgramId", "businessId"],
      { name: "course_enrollments_unique", unique: true },
    );

    // --------------------------------------------------------- resources
    await queryInterface.createTable("learning_resources", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      cohortProgramId: { type: Sequelize.INTEGER, allowNull: false },
      // A resource may be pinned to a module or lesson, or sit at programme
      // level and be reused by several.
      moduleId: { type: Sequelize.INTEGER, allowNull: true },
      lessonId: { type: Sequelize.INTEGER, allowNull: true },
      title: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      type: {
        type: Sequelize.ENUM(
          "template",
          "guide",
          "case_study",
          "checklist",
          "presentation",
          "video",
          "link",
          "other",
        ),
        allowNull: false,
        defaultValue: "template",
      },
      category: { type: Sequelize.STRING, allowNull: true },
      tags: { type: Sequelize.JSON, allowNull: true },
      file: { type: Sequelize.STRING, allowNull: true },
      url: { type: Sequelize.STRING, allowNull: true },
      downloadable: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      uploadedById: { type: Sequelize.INTEGER, allowNull: true },
      archivedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex("learning_resources", ["cohortProgramId"], {
      name: "learning_resources_program",
    });

    // Backfill an enrolment for everyone already on a programme, so the
    // learning roster is populated without anyone re-enrolling.
    await queryInterface.sequelize.query(`
      INSERT INTO course_enrollments
        (uuid, cohortProgramId, businessId, userId, enrolledAt, status, progressPercent, createdAt, updatedAt)
      SELECT UUID(), m.cohortProgramId, m.businessId, b.userId, m.createdAt, 'not_started', 0, NOW(), NOW()
      FROM cohort_memberships m
      JOIN Businesses b ON b.id = m.businessId
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("learning_resources");
    await queryInterface.dropTable("course_enrollments");
    await queryInterface.dropTable("workshop_recordings");
    await queryInterface.dropTable("workshop_attendance");
    await queryInterface.dropTable("workshops");
  },
};
