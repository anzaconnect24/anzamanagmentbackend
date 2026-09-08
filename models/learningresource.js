"use strict";
const { Model } = require("sequelize");

// A reusable learning resource: a template, guide, case study or checklist.
// It can sit at programme level or be pinned to a module or lesson.
module.exports = (sequelize, DataTypes) => {
  class LearningResource extends Model {
    static associate(models) {
      LearningResource.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
        targetKey: "id",
      });
      LearningResource.belongsTo(models.Course, {
        foreignKey: "courseId",
        targetKey: "id",
      });
      LearningResource.belongsTo(models.Module, {
        foreignKey: "moduleId",
        targetKey: "id",
      });
      LearningResource.belongsTo(models.Lesson, {
        foreignKey: "lessonId",
        targetKey: "id",
      });
    }
  }

  LearningResource.TYPES = [
    "template",
    "guide",
    "case_study",
    "checklist",
    "presentation",
    "video",
    "link",
    "other",
  ];

  LearningResource.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: { type: DataTypes.INTEGER, allowNull: false },
      moduleId: { type: DataTypes.INTEGER, allowNull: true },
      lessonId: { type: DataTypes.INTEGER, allowNull: true },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      type: {
        type: DataTypes.ENUM(
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
      category: { type: DataTypes.STRING, allowNull: true },
      tags: {
        type: DataTypes.JSON,
        allowNull: true,
        get() {
          const raw = this.getDataValue("tags");
          if (Array.isArray(raw)) return raw;
          if (typeof raw !== "string") return null;
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : null;
          } catch {
            return null;
          }
        },
      },
      file: { type: DataTypes.STRING, allowNull: true },
      url: { type: DataTypes.STRING, allowNull: true },
      downloadable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      uploadedById: { type: DataTypes.INTEGER, allowNull: true },
      archivedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "LearningResource",
      tableName: "learning_resources",
    },
  );

  return LearningResource;
};
