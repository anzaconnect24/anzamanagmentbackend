"use strict";
const { Model } = require("sequelize");

// A programme report. The snapshot holds the figures as they stood when the
// report was built; the narrative holds what the lead wrote around them.
module.exports = (sequelize, DataTypes) => {
  class ProgramReport extends Model {
    static associate(models) {
      ProgramReport.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
      });
      ProgramReport.belongsTo(models.User, {
        foreignKey: "createdById",
        as: "createdBy",
      });
    }
  }

  ProgramReport.TYPES = ["monthly", "quarterly", "donor", "final"];
  ProgramReport.STATUSES = ["draft", "final"];

  // The sections a lead writes. The figures answer "what happened"; these
  // answer "what it meant", which no aggregate can supply.
  ProgramReport.NARRATIVE_SECTIONS = [
    { key: "summary", label: "Executive summary" },
    { key: "progress", label: "Progress against objectives" },
    { key: "challenges", label: "Challenges and mitigation" },
    { key: "lessons", label: "Lessons learned" },
    { key: "caseStudy", label: "Case study" },
    { key: "nextPeriod", label: "Plans for the next period" },
  ];

  ProgramReport.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: { type: DataTypes.INTEGER, allowNull: false },
      reportType: { type: DataTypes.STRING, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      periodStart: DataTypes.DATEONLY,
      periodEnd: DataTypes.DATEONLY,
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "draft",
      },
      // MySQL hands JSON columns back as strings through this driver, so
      // every reader would otherwise have to parse them - and the one that
      // forgot would fail at the first property access. Parsed here instead,
      // once, so snapshot and narrative are always objects.
      snapshot: {
        type: DataTypes.JSON,
        get() {
          const value = this.getDataValue("snapshot");
          if (typeof value !== "string") return value;
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        },
      },
      narrative: {
        type: DataTypes.JSON,
        get() {
          const value = this.getDataValue("narrative");
          if (typeof value !== "string") return value;
          try {
            return JSON.parse(value);
          } catch {
            return {};
          }
        },
      },
      generatedAt: DataTypes.DATE,
      createdById: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "ProgramReport",
      tableName: "program_reports",
    },
  );

  return ProgramReport;
};
