"use strict";
const { Model } = require("sequelize");

// One learner's progress through one content item.
//
// A row used to mean only "opened". It now carries how far through a video the
// learner actually got, so a video is not counted as done just because the
// page was opened.
module.exports = (sequelize, DataTypes) => {
  class SlideReader extends Model {
    static associate(models) {
      SlideReader.belongsTo(models.User);
      SlideReader.belongsTo(models.Slide);
    }
  }

  SlideReader.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      slideId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // Video only: the furthest point reached, and where to resume from.
      secondsWatched: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      lastPosition: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      percentWatched: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // False while a video is still part-watched. Everything else is
      // complete the moment it is opened or ticked off.
      completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "SlideReader",
    },
  );

  return SlideReader;
};
