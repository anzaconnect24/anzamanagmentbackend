"use strict";
const { Model } = require("sequelize");

// A workshop run under a programme: physical, online, hybrid or a recording
// released on its own. It may belong to a module or stand alone.
module.exports = (sequelize, DataTypes) => {
  class Workshop extends Model {
    static associate(models) {
      Workshop.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
        targetKey: "id",
      });
      Workshop.belongsTo(models.Course, {
        foreignKey: "courseId",
        targetKey: "id",
      });
      Workshop.belongsTo(models.Module, {
        foreignKey: "moduleId",
        targetKey: "id",
      });
      Workshop.belongsTo(models.User, {
        foreignKey: "facilitatorId",
        as: "facilitator",
      });
      Workshop.hasMany(models.WorkshopAttendance, {
        foreignKey: "workshopId",
        sourceKey: "id",
        onDelete: "CASCADE",
      });
      Workshop.hasMany(models.WorkshopRecording, {
        foreignKey: "workshopId",
        sourceKey: "id",
        onDelete: "CASCADE",
      });
    }
  }

  Workshop.MODES = ["physical", "online", "hybrid", "recorded"];
  Workshop.STATUSES = ["draft", "scheduled", "completed", "cancelled"];

  const jsonList = (field) => ({
    type: DataTypes.JSON,
    allowNull: true,
    // This MySQL maps JSON to longtext and hands it back as text.
    get() {
      const raw = this.getDataValue(field);
      if (Array.isArray(raw)) return raw;
      if (typeof raw !== "string") return null;
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
  });

  Workshop.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: { type: DataTypes.INTEGER, allowNull: false },
      moduleId: { type: DataTypes.INTEGER, allowNull: true },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      objectives: { type: DataTypes.TEXT, allowNull: true },
      facilitatorId: { type: DataTypes.INTEGER, allowNull: true },
      facilitatorName: { type: DataTypes.STRING, allowNull: true },
      startsAt: { type: DataTypes.DATE, allowNull: false },
      endsAt: { type: DataTypes.DATE, allowNull: true },
      deliveryMode: {
        type: DataTypes.ENUM("physical", "online", "hybrid", "recorded"),
        allowNull: false,
        defaultValue: "online",
      },
      venue: { type: DataTypes.STRING, allowNull: true },
      meetingLink: { type: DataTypes.STRING, allowNull: true },
      joinWindowMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 15,
      },
      attendanceThresholdPercent: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 75,
      },
      attendanceRequired: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      slides: { type: DataTypes.STRING, allowNull: true },
      materials: jsonList("materials"),
      status: {
        type: DataTypes.ENUM("draft", "scheduled", "completed", "cancelled"),
        allowNull: false,
        defaultValue: "scheduled",
      },
      createdById: { type: DataTypes.INTEGER, allowNull: true },
    },
    { sequelize, modelName: "Workshop", tableName: "workshops" },
  );

  return Workshop;
};
