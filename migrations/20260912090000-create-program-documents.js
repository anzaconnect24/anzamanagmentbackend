"use strict";

// Structured document storage for a programme.
//
// Two tables, because a document and a file are not the same thing. The
// document is the standing item - "Grant agreement, Sagar Energy" - and carries
// the tags: programme, enterprise, activity, reporting period, category. Each
// upload against it is a version. currentVersionId names the authoritative
// one, so staff never have to guess which file is current from its name.
//
// MeEvidence stays as it is: it is M&E's verification trail against a specific
// record, not a library, and has no version history.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("program_documents", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      uuid: {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
      },

      // The tags. Only the programme is required - a training manual belongs
      // to the programme and to no single enterprise or activity.
      cohortProgramId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "cohort_programs", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      businessId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Businesses", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      activityId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "me_activities", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      reportingPeriod: { type: Sequelize.STRING, allowNull: true },

      category: { type: Sequelize.STRING, allowNull: false },
      title: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },

      // The authoritative version. Nullable only for the instant between
      // creating the document and storing its first file.
      currentVersionId: { type: Sequelize.INTEGER, allowNull: true },

      uploadedById: { type: Sequelize.INTEGER, allowNull: true },
      archivedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.createTable("program_document_versions", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      uuid: {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
      },
      documentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "program_documents", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      // 1, 2, 3 ... in upload order. Shown to staff, so it is a number they
      // can refer to rather than a timestamp they have to compare.
      versionNumber: { type: Sequelize.INTEGER, allowNull: false },

      fileName: { type: Sequelize.STRING, allowNull: true },
      fileUrl: { type: Sequelize.TEXT, allowNull: false },
      storageKey: { type: Sequelize.STRING, allowNull: true },
      mimeType: { type: Sequelize.STRING, allowNull: true },
      sizeBytes: { type: Sequelize.INTEGER, allowNull: true },

      // What changed, so the history reads as a record rather than a pile.
      notes: { type: Sequelize.TEXT, allowNull: true },

      uploadedById: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    // The library is read by programme, and filtered by its tags within that.
    await queryInterface
      .addIndex("program_documents", ["cohortProgramId", "category"], {
        name: "program_documents_programme_category",
      })
      .catch(() => {});

    // One version number per document.
    await queryInterface
      .addIndex("program_document_versions", ["documentId", "versionNumber"], {
        name: "program_document_versions_unique",
        unique: true,
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.dropTable("program_document_versions");
    await queryInterface.dropTable("program_documents");
  },
};
