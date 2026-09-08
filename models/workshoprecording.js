"use strict";
const { Model } = require("sequelize");

// A recording of a workshop. Publishing it into a course points a lesson
// content item at this same media rather than copying the file.
module.exports = (sequelize, DataTypes) => {
  class WorkshopRecording extends Model {
    static associate(models) {
      WorkshopRecording.belongsTo(models.Workshop, {
        foreignKey: "workshopId",
        targetKey: "id",
      });
      WorkshopRecording.belongsTo(models.Slide, {
        foreignKey: "slideId",
        targetKey: "id",
      });
    }
  }

  WorkshopRecording.ACCESS = ["programme", "attendees", "staff"];

  WorkshopRecording.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      workshopId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      file: { type: DataTypes.STRING, allowNull: true },
      url: { type: DataTypes.STRING, allowNull: true },
      durationSeconds: { type: DataTypes.INTEGER, allowNull: true },
      thumbnail: { type: DataTypes.STRING, allowNull: true },
      access: {
        type: DataTypes.ENUM("programme", "attendees", "staff"),
        allowNull: false,
        defaultValue: "programme",
      },
      slideId: { type: DataTypes.INTEGER, allowNull: true },
      createdById: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      sequelize,
      modelName: "WorkshopRecording",
      tableName: "workshop_recordings",
    },
  );

  return WorkshopRecording;
};
