"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class MentorReport extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      MentorReport.belongsTo(models.User, {
        as: "Mentor",
        foreignKey: "mentorId",
      });
      MentorReport.belongsTo(models.User, {
        as: "Entreprenuer",
        foreignKey: "entreprenuerId",
      });
    }
  }
  MentorReport.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      mentorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      entreprenuerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      meetingDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      meetingDuration: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      topicsDiscussed: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      progressMade: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      challengesFaced: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      actionItems: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      nextMeetingDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      overallProgress: {
        type: DataTypes.ENUM(
          "excellent",
          "good",
          "satisfactory",
          "needs-improvement",
        ),
        allowNull: true,
      },
      recommendations: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "MentorReport",
    },
  );
  return MentorReport;
};
