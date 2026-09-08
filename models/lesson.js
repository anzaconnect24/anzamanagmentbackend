"use strict";
const { Model } = require("sequelize");

// A lesson inside a module. Content items (Slides) hang off it, so the chain
// is Programme -> Module -> Lesson -> Content.
module.exports = (sequelize, DataTypes) => {
  class Lesson extends Model {
    static associate(models) {
      Lesson.belongsTo(models.Module, {
        foreignKey: "moduleId",
        targetKey: "id",
      });
      Lesson.hasMany(models.Slide, {
        foreignKey: "lessonId",
        sourceKey: "id",
      });
    }
  }

  Lesson.STATUSES = ["draft", "published", "archived"];
  Lesson.COMPLETION_RULES = ["content", "manual"];

  Lesson.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      moduleId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      estimatedMinutes: { type: DataTypes.INTEGER, allowNull: true },
      required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      completionRule: {
        type: DataTypes.ENUM("content", "manual"),
        allowNull: false,
        defaultValue: "content",
      },
      status: {
        type: DataTypes.ENUM("draft", "published", "archived"),
        allowNull: false,
        defaultValue: "published",
      },
      createdById: { type: DataTypes.INTEGER, allowNull: true },
      archivedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: "Lesson", tableName: "lessons" },
  );

  return Lesson;
};
