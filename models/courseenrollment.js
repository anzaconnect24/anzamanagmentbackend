"use strict";
const { Model } = require("sequelize");

// An enterprise's learning record on a programme.
//
// This does not restate who is on the programme — CohortMembership already
// does that, and duplicating it would let the two disagree. This carries only
// the learning state on top: when they started, where they got to, whether
// they finished, and by when they were meant to.
module.exports = (sequelize, DataTypes) => {
  class CourseEnrollment extends Model {
    static associate(models) {
      CourseEnrollment.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
        targetKey: "id",
      });
      // A startup enrols in a course, not in the programme as a whole.
      CourseEnrollment.belongsTo(models.Course, {
        foreignKey: "courseId",
        targetKey: "id",
      });
      CourseEnrollment.belongsTo(models.Business, {
        foreignKey: "businessId",
        targetKey: "id",
      });
    }
  }

  CourseEnrollment.SOURCES = ["self", "staff"];

  CourseEnrollment.STATUSES = [
    "not_started",
    "in_progress",
    "completed",
    "overdue",
    "archived",
  ];

  CourseEnrollment.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: { type: DataTypes.INTEGER, allowNull: false },
      businessId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: true },
      enrolledAt: { type: DataTypes.DATE, allowNull: true },
      // How the record came about. Only "self" means the startup chose the
      // course; "staff" covers a roster assignment and the programme-wide
      // backfill, neither of which is the startup enrolling. Defaults to
      // "staff" so a path that forgets to set it cannot inflate the
      // self-enrolment count.
      enrolledBy: {
        type: DataTypes.ENUM("self", "staff"),
        allowNull: false,
        defaultValue: "staff",
      },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      completedAt: { type: DataTypes.DATE, allowNull: true },
      dueAt: { type: DataTypes.DATE, allowNull: true },
      progressPercent: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.ENUM(
          "not_started",
          "in_progress",
          "completed",
          "overdue",
          "archived",
        ),
        allowNull: false,
        defaultValue: "not_started",
      },
    },
    {
      sequelize,
      modelName: "CourseEnrollment",
      tableName: "course_enrollments",
    },
  );

  return CourseEnrollment;
};
