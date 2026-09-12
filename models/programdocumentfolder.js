"use strict";
const { Model } = require("sequelize");

// A folder in a programme's document library.
//
// Folders are the programme's own filing, and are deliberately thinner than
// the category tags: a name, a colour, an order. They never nest — a lead
// filing an attendance sheet should not have to decide how deep it goes.
module.exports = (sequelize, DataTypes) => {
  class ProgramDocumentFolder extends Model {
    static associate(models) {
      ProgramDocumentFolder.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
      });
      ProgramDocumentFolder.belongsTo(models.User, {
        foreignKey: "createdById",
        as: "createdBy",
      });

      // The documents fall back to "Unfiled" if the folder goes; they are not
      // owned by it.
      ProgramDocumentFolder.hasMany(models.ProgramDocument, {
        foreignKey: "folderId",
        as: "documents",
      });
    }
  }

  // The palette, in the order it is handed out. Colour names rather than hex,
  // so the screen decides what each looks like in light and dark alike. New
  // folders take the next unused colour, which is what makes a library of
  // folders readable at a glance instead of a wall of one shade.
  ProgramDocumentFolder.COLOURS = [
    "blue",
    "amber",
    "emerald",
    "violet",
    "rose",
    "cyan",
    "orange",
    "indigo",
    "teal",
    "slate",
  ];

  ProgramDocumentFolder.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      colour: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "blue",
      },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdById: DataTypes.INTEGER,
      archivedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "ProgramDocumentFolder",
      tableName: "program_document_folders",
    },
  );

  return ProgramDocumentFolder;
};
