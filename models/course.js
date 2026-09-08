"use strict";
const { Model } = require("sequelize");

// A course inside a programme. Startups enrol in a course, and its modules,
// workshops and resources hang off it:
//
//   Programme -> Course -> Modules / Workshops / Resources
module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    static associate(models) {
      Course.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
        targetKey: "id",
      });
      Course.hasMany(models.Module, {
        foreignKey: "courseId",
        sourceKey: "id",
      });
      Course.hasMany(models.Workshop, {
        foreignKey: "courseId",
        sourceKey: "id",
      });
      Course.hasMany(models.LearningResource, {
        foreignKey: "courseId",
        sourceKey: "id",
      });
      Course.hasMany(models.CourseEnrollment, {
        foreignKey: "courseId",
        sourceKey: "id",
      });
    }
  }

  Course.STATUSES = ["draft", "published", "archived"];

  Course.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      image: { type: DataTypes.STRING, allowNull: true },
      objectives: { type: DataTypes.TEXT, allowNull: true },
      estimatedHours: { type: DataTypes.INTEGER, allowNull: true },
      startDate: { type: DataTypes.DATEONLY, allowNull: true },
      endDate: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.ENUM("draft", "published", "archived"),
        allowNull: false,
        defaultValue: "published",
      },
      // Whether a startup on the programme may enrol themselves.
      selfEnroll: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdById: { type: DataTypes.INTEGER, allowNull: true },
      archivedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: "Course", tableName: "courses" },
  );

  return Course;
};
