"use strict";
const { Model } = require("sequelize");

// A document held against a programme. The row is the standing item - "Grant
// agreement, Sagar Energy" - and every file uploaded against it is a version.
// currentVersionId names the authoritative one, so which file is current is a
// fact in the data rather than a guess from the filename.
//
// Only the programme is required. A training manual belongs to the programme
// and to no single enterprise; a signed grant agreement belongs to one.
module.exports = (sequelize, DataTypes) => {
  class ProgramDocument extends Model {
    static associate(models) {
      ProgramDocument.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
      });
      ProgramDocument.belongsTo(models.Business, { foreignKey: "businessId" });
      ProgramDocument.belongsTo(models.ProgramDocumentFolder, {
        foreignKey: "folderId",
        as: "folder",
      });
      ProgramDocument.belongsTo(models.MeActivity, {
        foreignKey: "activityId",
        as: "activity",
      });
      ProgramDocument.belongsTo(models.User, {
        foreignKey: "uploadedById",
        as: "uploadedBy",
      });

      ProgramDocument.hasMany(models.ProgramDocumentVersion, {
        foreignKey: "documentId",
        as: "versions",
        onDelete: "cascade",
      });

      // The authoritative file.
      ProgramDocument.belongsTo(models.ProgramDocumentVersion, {
        foreignKey: "currentVersionId",
        as: "currentVersion",
        constraints: false,
      });
    }
  }

  // What a programme actually files. Kept as a list rather than free text so
  // the library can be browsed by kind instead of searched by guesswork.
  ProgramDocument.CATEGORIES = [
    "agreement",
    "proposal",
    "participant_document",
    "training_material",
    "attendance_sheet",
    "photo",
    "report",
    "invoice",
    "due_diligence",
    "grant_evidence",
    "contract",
    "other",
  ];

  ProgramDocument.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: { type: DataTypes.INTEGER, allowNull: false },
      businessId: DataTypes.INTEGER,
      activityId: DataTypes.INTEGER,
      folderId: DataTypes.INTEGER,
      reportingPeriod: DataTypes.STRING,
      category: { type: DataTypes.STRING, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      description: DataTypes.TEXT,
      currentVersionId: DataTypes.INTEGER,
      uploadedById: DataTypes.INTEGER,
      archivedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "ProgramDocument",
      tableName: "program_documents",
    },
  );

  return ProgramDocument;
};
