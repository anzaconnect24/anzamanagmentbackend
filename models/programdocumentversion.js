"use strict";
const { Model } = require("sequelize");

// One uploaded file against a document. Versions are never overwritten: a new
// upload adds a row and moves the document's currentVersionId, so the history
// stays intact and an older contract can still be produced when asked for.
module.exports = (sequelize, DataTypes) => {
  class ProgramDocumentVersion extends Model {
    static associate(models) {
      ProgramDocumentVersion.belongsTo(models.ProgramDocument, {
        foreignKey: "documentId",
      });
      ProgramDocumentVersion.belongsTo(models.User, {
        foreignKey: "uploadedById",
        as: "uploadedBy",
      });
    }
  }

  ProgramDocumentVersion.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      documentId: { type: DataTypes.INTEGER, allowNull: false },
      versionNumber: { type: DataTypes.INTEGER, allowNull: false },
      fileName: DataTypes.STRING,
      fileUrl: { type: DataTypes.TEXT, allowNull: false },
      storageKey: DataTypes.STRING,
      mimeType: DataTypes.STRING,
      sizeBytes: DataTypes.INTEGER,
      notes: DataTypes.TEXT,
      uploadedById: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "ProgramDocumentVersion",
      tableName: "program_document_versions",
    },
  );

  return ProgramDocumentVersion;
};
