"use strict";

// Monitoring & Evaluation, phase 1: the results framework, the indicator
// registry and their targets, plus the audit trail every M&E write goes
// through. Everything is scoped to a cohort programme, so two programmes can
// track completely different things without any of it being hard-coded.
module.exports = {
  async up(queryInterface, Sequelize) {
    // One framework per programme: the goal statement and the thresholds that
    // decide whether an indicator reads green, amber or red.
    await queryInterface.createTable("me_frameworks", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      cohortProgramId: { type: Sequelize.INTEGER, allowNull: false },
      goal: { type: Sequelize.TEXT, allowNull: true },
      // Achievement at or above this reads On Track.
      onTrackThreshold: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 90,
      },
      // At or above this but below onTrack reads Attention Required.
      attentionThreshold: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 70,
      },
      // Official figures use verified data only unless this is turned on.
      includeSelfReported: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdById: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex("me_frameworks", ["cohortProgramId"], {
      name: "me_frameworks_program",
      unique: true,
    });

    // Outcomes and outputs, as one self-referencing tree. An output's parent
    // is its outcome; an outcome has no parent.
    await queryInterface.createTable("me_results", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      frameworkId: { type: Sequelize.INTEGER, allowNull: false },
      parentId: { type: Sequelize.INTEGER, allowNull: true },
      level: {
        type: Sequelize.ENUM("outcome", "output"),
        allowNull: false,
        defaultValue: "outcome",
      },
      // "Outcome 1", "Output 1.1" — the code shown in the tree.
      code: { type: Sequelize.STRING, allowNull: true },
      title: { type: Sequelize.TEXT, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      // Soft deletion: archived results stay for audit but leave the tree.
      archivedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex("me_results", ["frameworkId"], {
      name: "me_results_framework",
    });
    await queryInterface.addIndex("me_results", ["parentId"], {
      name: "me_results_parent",
    });

    // The indicator registry. Programme-scoped on purpose: an indicator may be
    // copied from the library but its target and definition belong to the
    // programme tracking it.
    await queryInterface.createTable("me_indicators", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      cohortProgramId: { type: Sequelize.INTEGER, allowNull: false },
      // Which outcome or output this sits under. Null means it measures the
      // goal directly.
      resultId: { type: Sequelize.INTEGER, allowNull: true },
      code: { type: Sequelize.STRING, allowNull: true },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      definition: { type: Sequelize.TEXT, allowNull: true },
      resultLevel: {
        type: Sequelize.ENUM("goal", "outcome", "output", "activity"),
        allowNull: false,
        defaultValue: "outcome",
      },
      indicatorType: {
        type: Sequelize.ENUM(
          "number",
          "percentage",
          "currency",
          "ratio",
          "score",
          "qualitative",
        ),
        allowNull: false,
        defaultValue: "number",
      },
      unit: { type: Sequelize.STRING, allowNull: true },
      baselineValue: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
      targetValue: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
      targetDate: { type: Sequelize.DATEONLY, allowNull: true },
      frequency: {
        type: Sequelize.ENUM(
          "one_time",
          "monthly",
          "quarterly",
          "semi_annual",
          "annual",
          "baseline",
          "midline",
          "endline",
          "post_programme",
        ),
        allowNull: false,
        defaultValue: "quarterly",
      },
      // Where the number comes from. An automatic source is computed from
      // records the platform already holds; "manual" is keyed in by M&E.
      dataSource: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "manual",
      },
      responsiblePerson: { type: Sequelize.STRING, allowNull: true },
      verificationMethod: { type: Sequelize.TEXT, allowNull: true },
      calculationMethod: { type: Sequelize.TEXT, allowNull: true },
      // Which dimensions this indicator may be broken down by.
      disaggregation: { type: Sequelize.JSON, allowNull: true },
      // False for indicators where a smaller number is the better result
      // (dropout rate, days to disbursement).
      higherIsBetter: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      status: {
        type: Sequelize.ENUM("active", "draft", "archived"),
        allowNull: false,
        defaultValue: "active",
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdById: { type: Sequelize.INTEGER, allowNull: true },
      archivedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex("me_indicators", ["cohortProgramId"], {
      name: "me_indicators_program",
    });
    await queryInterface.addIndex("me_indicators", ["resultId"], {
      name: "me_indicators_result",
    });

    // A reported figure for an indicator. Manual indicators store their
    // actuals here; automatic ones are computed and never written.
    await queryInterface.createTable("me_indicator_values", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      indicatorId: { type: Sequelize.INTEGER, allowNull: false },
      // Null means the value covers the programme to date rather than one
      // reporting period. Reporting periods arrive in phase 2.
      periodId: { type: Sequelize.INTEGER, allowNull: true },
      // Set when the figure belongs to one enterprise rather than the
      // programme as a whole.
      businessId: { type: Sequelize.INTEGER, allowNull: true },
      value: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
      narrative: { type: Sequelize.TEXT, allowNull: true },
      // How the figure was arrived at, for the verified/self-reported split.
      origin: {
        type: Sequelize.ENUM("manual", "enterprise_report", "survey", "system"),
        allowNull: false,
        defaultValue: "manual",
      },
      verificationStatus: {
        type: Sequelize.ENUM(
          "reported",
          "evidence_submitted",
          "under_verification",
          "verified",
          "revision_required",
          "rejected",
        ),
        allowNull: false,
        defaultValue: "reported",
      },
      // What the verifier accepted, which may differ from what was reported.
      verifiedValue: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
      verifiedById: { type: Sequelize.INTEGER, allowNull: true },
      verifiedAt: { type: Sequelize.DATE, allowNull: true },
      reviewerComments: { type: Sequelize.TEXT, allowNull: true },
      submittedById: { type: Sequelize.INTEGER, allowNull: true },
      submittedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex("me_indicator_values", ["indicatorId"], {
      name: "me_indicator_values_indicator",
    });
    await queryInterface.addIndex("me_indicator_values", ["businessId"], {
      name: "me_indicator_values_business",
    });

    // Every M&E write is recorded here, keeping the value it replaced.
    await queryInterface.createTable("me_audit_logs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      cohortProgramId: { type: Sequelize.INTEGER, allowNull: true },
      entityType: { type: Sequelize.STRING, allowNull: false },
      entityId: { type: Sequelize.INTEGER, allowNull: true },
      entityUuid: { type: Sequelize.STRING, allowNull: true },
      action: { type: Sequelize.STRING, allowNull: false },
      // The fields that changed, as { field: { from, to } }.
      changes: { type: Sequelize.JSON, allowNull: true },
      comments: { type: Sequelize.TEXT, allowNull: true },
      actorId: { type: Sequelize.INTEGER, allowNull: true },
      actorRole: { type: Sequelize.STRING, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex("me_audit_logs", ["cohortProgramId"], {
      name: "me_audit_logs_program",
    });
    await queryInterface.addIndex("me_audit_logs", ["entityType", "entityId"], {
      name: "me_audit_logs_entity",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("me_audit_logs");
    await queryInterface.dropTable("me_indicator_values");
    await queryInterface.dropTable("me_indicators");
    await queryInterface.dropTable("me_results");
    await queryInterface.dropTable("me_frameworks");
  },
};
