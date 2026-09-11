"use strict";
const { Model } = require("sequelize");

// One send from the programme lead to its cohort. The Notification rows are
// the delivery; this is the record that the send happened, who it reached and
// what kind of message it was.
module.exports = (sequelize, DataTypes) => {
  class ProgramAnnouncement extends Model {
    static associate(models) {
      ProgramAnnouncement.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
      });
      ProgramAnnouncement.belongsTo(models.User, {
        foreignKey: "sentById",
        as: "sentBy",
      });
    }
  }

  // What a programme sends its cohort.
  ProgramAnnouncement.TYPES = [
    "announcement",
    "workshop_reminder",
    "milestone_reminder",
    "survey_request",
    "reporting_request",
  ];

  // cohort   - everyone on the programme
  // selected - named enterprises
  // behind   - the ones with an open risk flag or an overdue report
  ProgramAnnouncement.AUDIENCES = ["cohort", "selected", "behind"];

  ProgramAnnouncement.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: { type: DataTypes.INTEGER, allowNull: false },
      messageType: { type: DataTypes.STRING, allowNull: false },
      audience: { type: DataTypes.STRING, allowNull: false },
      subject: { type: DataTypes.STRING, allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      recipientCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      sentById: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "ProgramAnnouncement",
      tableName: "program_announcements",
    },
  );

  return ProgramAnnouncement;
};
