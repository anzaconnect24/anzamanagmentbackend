"use strict";

// Folders for the programme document library.
//
// The category tag already says what a document *is* ("invoice", "contract").
// A folder says where a programme chose to put it — "Cohort 3 site visits",
// "Donor pack, March" — which is a different question, and one only the people
// running the programme can answer. So folders sit alongside the tags rather
// than replacing them.
//
// A folder is never required. Documents filed before folders existed, and any
// filed without one, stay readable as "Unfiled" — no back-fill, no guessing.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("program_document_folders", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      uuid: {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
      },

      cohortProgramId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "cohort_programs", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      name: { type: Sequelize.STRING, allowNull: false },

      // A colour name, not a hex value: the screen owns how "amber" looks, and
      // a stored hex would drift from the palette the moment it is restyled.
      colour: { type: Sequelize.STRING, allowNull: false, defaultValue: "blue" },

      position: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },

      createdById: { type: Sequelize.INTEGER, allowNull: true },
      archivedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    // Where the document sits. Nullable: "Unfiled" is a legitimate state, not
    // an error, and removing a folder must never take its documents with it.
    await queryInterface.addColumn("program_documents", "folderId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "program_document_folders", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    await queryInterface
      .addIndex("program_document_folders", ["cohortProgramId"], {
        name: "program_document_folders_programme",
      })
      .catch(() => {});

    await queryInterface
      .addIndex("program_documents", ["folderId"], {
        name: "program_documents_folder",
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("program_documents", "folderId");
    await queryInterface.dropTable("program_document_folders");
  },
};
