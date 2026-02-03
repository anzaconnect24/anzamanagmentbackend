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
      sessionOverview: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      menteeEngagementRating: {
        type: DataTypes.ENUM("excellent", "good", "fair", "needs-improvement"),
        allowNull: true,
      },
      menteeEngagementComments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      significantProgress: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      progressDetails: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      areasForImprovement: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      nextSteps: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      supportNeeded: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      supportDetails: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      overallFeedback: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      sessionRating: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5,
        },
      },
    },
    {
      sequelize,
      modelName: "MentorReport",
    },
  );
  return MentorReport;
};
