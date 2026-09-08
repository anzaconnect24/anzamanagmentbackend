"use strict";
const { Model } = require("sequelize");

// A content item inside a lesson: a block of text, a video, a slide deck, a
// document or an external link. Still called Slide because the table, the API
// and every existing record use that name — only what it can hold has grown.
module.exports = (sequelize, DataTypes) => {
  class Slide extends Model {
    static associate(models) {
      Slide.belongsTo(models.Module, {
        foreignKey: "moduleId",
        targetKey: "id",
      });
      Slide.belongsTo(models.Lesson, {
        foreignKey: "lessonId",
        targetKey: "id",
      });
      // Slide.belongsTo(models.User);
      Slide.hasMany(models.SlideReader);
    }
  }

  Slide.TYPES = ["text", "file", "video", "presentation", "document", "link"];

  // How much of a video counts as watched. Overridable per programme later;
  // a learner opening the page is never enough on its own.
  Slide.VIDEO_COMPLETION_PERCENT = 90;

  Slide.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // Kept for the modules that predate lessons, and so a content item can
      // always be traced to its module in one hop.
      moduleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      lessonId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      content: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      // An uploaded file, stored by the platform's file service; only the
      // reference lives here.
      file: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      // An external or embedded video, or a link.
      url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      durationSeconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      thumbnail: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      downloadable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      type: {
        type: DataTypes.ENUM(
          "text",
          "file",
          "video",
          "presentation",
          "document",
          "link",
        ),
        defaultValue: "text",
      },
    },
    {
      sequelize,
      modelName: "Slide",
    },
  );

  return Slide;
};
