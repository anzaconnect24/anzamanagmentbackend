"use strict";

// Programme milestones and KPIs: what a Business Development Advisor asks every
// startup on a programme to report, and what each startup reports back.
//
// Two tables. A target belongs to the programme, so it is written once and
// every member reports against the same definition. A submission is one
// startup's line against one target — one row per (target, business), so a
// startup revises its line rather than piling up copies, and the advisor can
// approve or send back each line on its own.
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const has = (name) =>
      tables.some((table) => (typeof table === "string" ? table : table.tableName) === name);

    if (!has("program_targets")) {
      await queryInterface.createTable("program_targets", {
        id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
        uuid: { type: Sequelize.UUID, allowNull: false, defaultValue: Sequelize.UUIDV4, unique: true },
        cohortProgramId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "cohort_programs", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },

        // "milestone" — a deliverable the startup marks done; "kpi" — a figure
        // the startup reports against a target.
        kind: { type: Sequelize.STRING(20), allowNull: false },
        title: { type: Sequelize.STRING, allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },

        // KPI only: what the figure is measured in ("jobs", "TZS", "%").
        unit: { type: Sequelize.STRING(60), allowNull: true },
        targetValue: { type: Sequelize.STRING, allowNull: true },
        dueDate: { type: Sequelize.DATEONLY, allowNull: true },
        evidenceRequired: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },

        position: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        createdById: { type: Sequelize.INTEGER, allowNull: true },

        // A target startups already reported against is archived, not deleted,
        // so their submissions stay on record.
        archivedAt: { type: Sequelize.DATE, allowNull: true },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE },
      });

      await queryInterface
        .addIndex("program_targets", ["cohortProgramId", "position"], {
          name: "program_targets_order",
        })
        .catch(() => {});
    }

    if (!has("program_target_submissions")) {
      await queryInterface.createTable("program_target_submissions", {
        id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
        uuid: { type: Sequelize.UUID, allowNull: false, defaultValue: Sequelize.UUIDV4, unique: true },
        targetId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "program_targets", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        businessId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "Businesses", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },

        // KPI: the reported figure. Milestone: where it stands.
        value: { type: Sequelize.STRING, allowNull: true },
        completionStatus: { type: Sequelize.STRING(30), allowNull: true },
        narrative: { type: Sequelize.TEXT, allowNull: true },
        evidenceUrls: { type: Sequelize.TEXT, allowNull: true },

        // draft → submitted → approved | revision_requested → submitted …
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: "draft" },
        submittedById: { type: Sequelize.INTEGER, allowNull: true },
        submittedAt: { type: Sequelize.DATE, allowNull: true },
        reviewedById: { type: Sequelize.INTEGER, allowNull: true },
        reviewedAt: { type: Sequelize.DATE, allowNull: true },
        reviewNotes: { type: Sequelize.TEXT, allowNull: true },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE },
      });

      await queryInterface
        .addIndex("program_target_submissions", ["targetId", "businessId"], {
          name: "program_target_submissions_target_business",
          unique: true,
        })
        .catch(() => {});
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("program_target_submissions");
    await queryInterface.dropTable("program_targets");
  },
};
