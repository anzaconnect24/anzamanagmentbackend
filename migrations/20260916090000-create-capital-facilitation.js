"use strict";

// Capital facilitation: the Capital Facilitation Manager ("CFM") and the
// deal-flow records they run.
//
// What already existed is extended rather than duplicated:
//   Logs           - becomes the capital audit trail. It already carried
//                    resourceType / metadata / ipAddress / userAgent; this adds
//                    who-in-what-role, the entities touched, and old/new values.
//   Notifications  - gains a type and a link so a notification can open the
//                    record it is about.
//   Permissions    - was never read by the authorization code. It gains a
//                    machine key and a module, and role_permissions finally
//                    connects roles to permissions, so an administrator can
//                    reconfigure who may do what without a code change.
//
// Everything the platform had no concept of gets its own table: capital
// requests, providers, opportunities (one per request x provider), introductions,
// moderated threads and messages, deal rooms and documents, due diligence,
// interventions, internal notes, settings, and a reminder ledger that stops
// scheduled notifications repeating.

const PERMISSIONS = [
  ["capital.dashboard.view", "View the capital facilitation dashboard"],
  ["capital.requests.view", "View capital requests"],
  ["capital.requests.review", "Review, approve, hold, decline and assign capital requests"],
  ["capital.providers.view", "View capital provider profiles"],
  ["capital.providers.manage", "Create and edit capital provider profiles"],
  ["capital.matching.manage", "Run matching and select capital providers"],
  ["capital.introductions.manage", "Approve, decline, redirect and schedule introductions"],
  ["capital.opportunities.view", "View capital opportunities and the pipeline"],
  ["capital.opportunities.manage", "Move opportunities through the pipeline and edit them"],
  ["capital.communications.moderate", "Oversee, moderate and change the mode of capital conversations"],
  ["capital.dealrooms.manage", "Create deal rooms and manage document permissions"],
  ["capital.documents.confidential", "Open confidential capital documents"],
  ["capital.duediligence.manage", "Manage due diligence checklists"],
  ["capital.interventions.manage", "Intervene on active opportunities"],
  ["capital.notes.manage", "Write and read confidential internal notes"],
  ["capital.outcomes.manage", "Record outcomes, commitments, disbursements and Anza's contribution"],
  ["capital.reports.view", "View capital facilitation reports"],
  ["capital.audit.view", "View the capital facilitation audit trail"],
  ["capital.settings.manage", "Change capital facilitation settings"],
  ["capital.permissions.manage", "Configure which roles hold capital permissions"],
];

// The Capital Facilitation Manager holds every capital permission. An
// administrator is given only what lets them govern the function - the
// permission matrix, the audit trail and the reports - not the deal flow
// itself; they can grant themselves more from the matrix.
const ADMIN_DEFAULTS = [
  "capital.permissions.manage",
  "capital.audit.view",
  "capital.reports.view",
];

const id = (Sequelize) => ({
  allowNull: false,
  autoIncrement: true,
  primaryKey: true,
  type: Sequelize.INTEGER,
});

const uuid = (Sequelize) => ({
  type: Sequelize.UUID,
  allowNull: false,
  unique: true,
});

const stamps = (Sequelize) => ({
  createdAt: { allowNull: false, type: Sequelize.DATE },
  updatedAt: { allowNull: false, type: Sequelize.DATE },
});

const ref = (Sequelize, table, { allowNull = true, onDelete = "SET NULL" } = {}) => ({
  type: Sequelize.INTEGER,
  allowNull,
  references: { model: table, key: "id" },
  onDelete,
  onUpdate: "CASCADE",
});

const money = (Sequelize) => ({ type: Sequelize.DECIMAL(16, 2), allowNull: true });

const index = (queryInterface, table, fields, name, unique = false) =>
  queryInterface.addIndex(table, fields, { name, unique }).catch(() => {});

module.exports = {
  async up(queryInterface, Sequelize) {
    const S = Sequelize;

    // ---- Logs -> audit trail ------------------------------------------------
    await queryInterface.sequelize.query(
      "ALTER TABLE Logs MODIFY actionType ENUM('login','crat_update','module_start','resource_access','other','capital') NOT NULL DEFAULT 'other'",
    );

    const logs = await queryInterface.describeTable("Logs");
    const addLog = async (name, spec) => {
      if (!logs[name]) await queryInterface.addColumn("Logs", name, spec);
    };
    await addLog("module", { type: S.STRING(40), allowNull: true });
    await addLog("role", { type: S.STRING(40), allowNull: true });
    await addLog("capitalOpportunityId", { type: S.INTEGER, allowNull: true });
    await addLog("businessId", { type: S.INTEGER, allowNull: true });
    await addLog("capitalProviderId", { type: S.INTEGER, allowNull: true });
    await addLog("oldValue", { type: S.TEXT("long"), allowNull: true });
    await addLog("newValue", { type: S.TEXT("long"), allowNull: true });
    await index(queryInterface, "Logs", ["module", "createdAt"], "logs_module_created");
    await index(queryInterface, "Logs", ["capitalOpportunityId"], "logs_capital_opportunity");

    // ---- Notifications ------------------------------------------------------
    const notes = await queryInterface.describeTable("Notifications");
    if (!notes.type) await queryInterface.addColumn("Notifications", "type", { type: S.STRING(60), allowNull: true });
    if (!notes.link) await queryInterface.addColumn("Notifications", "link", { type: S.STRING(255), allowNull: true });

    // ---- Permissions + role_permissions ------------------------------------
    const perms = await queryInterface.describeTable("Permissions");
    if (!perms.key) await queryInterface.addColumn("Permissions", "key", { type: S.STRING(80), allowNull: true });
    if (!perms.module) await queryInterface.addColumn("Permissions", "module", { type: S.STRING(40), allowNull: true });
    await index(queryInterface, "Permissions", ["key"], "permissions_key", true);

    await queryInterface.createTable("role_permissions", {
      id: id(S),
      uuid: uuid(S),
      // User.role is a string, so a grant is keyed by that string.
      role: { type: S.STRING(40), allowNull: false },
      permissionId: ref(S, "Permissions", { allowNull: false, onDelete: "CASCADE" }),
      ...stamps(S),
    });
    await index(queryInterface, "role_permissions", ["role", "permissionId"], "role_permissions_unique", true);

    // ---- Capital providers --------------------------------------------------
    await queryInterface.createTable("capital_providers", {
      id: id(S),
      uuid: uuid(S),
      name: { type: S.STRING, allowNull: false },
      providerType: { type: S.STRING(40), allowNull: false, defaultValue: "investor" },
      // Linked when the provider is also a platform account (an investor).
      userId: ref(S, "Users"),
      investorProfileId: { type: S.INTEGER, allowNull: true },
      preferredSectors: { type: S.JSON, allowNull: true },
      preferredGeographies: { type: S.JSON, allowNull: true },
      enterpriseStages: { type: S.JSON, allowNull: true },
      minTicketUsd: money(S),
      maxTicketUsd: money(S),
      instruments: { type: S.JSON, allowNull: true },
      impactThemes: { type: S.JSON, allowNull: true },
      esgRequirements: { type: S.TEXT, allowNull: true },
      genderPreference: { type: S.STRING(30), allowNull: true },
      youthPreference: { type: S.BOOLEAN, allowNull: true },
      minAnnualRevenueUsd: money(S),
      tractionRequirements: { type: S.TEXT, allowNull: true },
      eligibilityCriteria: { type: S.TEXT, allowNull: true },
      financingCriteria: { type: S.TEXT, allowNull: true },
      previousTransactions: { type: S.TEXT, allowNull: true },
      capitalAppetite: { type: S.STRING(20), allowNull: true },
      // Confidential until an approved introduction.
      contactName: { type: S.STRING, allowNull: true },
      contactEmail: { type: S.STRING, allowNull: true },
      contactPhone: { type: S.STRING, allowNull: true },
      applicationWindowOpens: { type: S.DATEONLY, allowNull: true },
      applicationWindowCloses: { type: S.DATEONLY, allowNull: true },
      requiredDocuments: { type: S.JSON, allowNull: true },
      status: { type: S.STRING(20), allowNull: false, defaultValue: "active" },
      createdById: ref(S, "Users"),
      ...stamps(S),
    });
    await index(queryInterface, "capital_providers", ["userId"], "capital_providers_user");
    await index(queryInterface, "capital_providers", ["providerType", "status"], "capital_providers_type_status");

    // ---- Capital requests ---------------------------------------------------
    await queryInterface.createTable("capital_requests", {
      id: id(S),
      uuid: uuid(S),
      reference: { type: S.STRING(20), allowNull: false, unique: true },
      businessId: ref(S, "Businesses", { allowNull: false, onDelete: "CASCADE" }),
      userId: ref(S, "Users"),
      cohortProgramId: { type: S.INTEGER, allowNull: true },
      // The investment request this was created from, where there was one.
      legacyRequestId: { type: S.INTEGER, allowNull: true },
      amountRequested: money(S),
      currency: { type: S.STRING(8), allowNull: false, defaultValue: "USD" },
      amountUsd: money(S),
      financingType: { type: S.STRING(40), allowNull: false, defaultValue: "other" },
      purpose: { type: S.TEXT, allowNull: true },
      preferredProviderTypes: { type: S.JSON, allowNull: true },
      currentRevenue: money(S),
      revenueCurrency: { type: S.STRING(8), allowNull: true },
      traction: { type: S.TEXT, allowNull: true },
      readinessStatus: { type: S.STRING(30), allowNull: false, defaultValue: "not_assessed" },
      founderGender: { type: S.STRING(20), allowNull: true },
      youthLed: { type: S.BOOLEAN, allowNull: true },
      status: { type: S.STRING(40), allowNull: false, defaultValue: "submitted" },
      assignedManagerId: ref(S, "Users"),
      submittedAt: { type: S.DATE, allowNull: true },
      reviewedAt: { type: S.DATE, allowNull: true },
      reviewedById: ref(S, "Users"),
      infoRequest: { type: S.TEXT, allowNull: true },
      recommendations: { type: S.TEXT, allowNull: true },
      declineReason: { type: S.TEXT, allowNull: true },
      ...stamps(S),
    });
    await index(queryInterface, "capital_requests", ["status", "submittedAt"], "capital_requests_status");
    await index(queryInterface, "capital_requests", ["businessId"], "capital_requests_business");
    await index(queryInterface, "capital_requests", ["legacyRequestId"], "capital_requests_legacy", true);

    // ---- Capital opportunities (one per request x provider) -----------------
    await queryInterface.createTable("capital_opportunities", {
      id: id(S),
      uuid: uuid(S),
      reference: { type: S.STRING(20), allowNull: false, unique: true },
      capitalRequestId: ref(S, "capital_requests", { allowNull: false, onDelete: "CASCADE" }),
      capitalProviderId: ref(S, "capital_providers", { allowNull: false, onDelete: "CASCADE" }),
      businessId: ref(S, "Businesses", { allowNull: false, onDelete: "CASCADE" }),
      stage: { type: S.STRING(40), allowNull: false, defaultValue: "matching" },
      status: { type: S.STRING(20), allowNull: false, defaultValue: "active" },
      probability: { type: S.INTEGER, allowNull: true },
      matchScore: { type: S.INTEGER, allowNull: true },
      matchBreakdown: { type: S.JSON, allowNull: true },
      matchExplanation: { type: S.TEXT, allowNull: true },
      potentialAmount: money(S),
      currency: { type: S.STRING(8), allowNull: false, defaultValue: "USD" },
      financingType: { type: S.STRING(40), allowNull: true },
      assignedManagerId: ref(S, "Users"),
      nextAction: { type: S.STRING, allowNull: true },
      nextActionDate: { type: S.DATEONLY, allowNull: true },
      lastActivityAt: { type: S.DATE, allowNull: true },
      communicationMode: { type: S.STRING(12), allowNull: false, defaultValue: "moderated" },
      communicationPaused: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
      introductionApprovedAt: { type: S.DATE, allowNull: true },
      meetingAt: { type: S.DATE, allowNull: true },
      escalated: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
      flags: { type: S.JSON, allowNull: true },
      outcome: { type: S.STRING(40), allowNull: true },
      amountApproved: money(S),
      amountCommitted: money(S),
      amountDisbursed: money(S),
      dateCommitted: { type: S.DATEONLY, allowNull: true },
      dateDisbursed: { type: S.DATEONLY, allowNull: true },
      financingTerms: { type: S.TEXT, allowNull: true },
      capitalSource: { type: S.STRING, allowNull: true },
      anzaContribution: { type: S.JSON, allowNull: true },
      anzaContributionNotes: { type: S.TEXT, allowNull: true },
      closedAt: { type: S.DATE, allowNull: true },
      closedReason: { type: S.TEXT, allowNull: true },
      ...stamps(S),
    });
    await index(queryInterface, "capital_opportunities", ["capitalRequestId", "capitalProviderId"], "capital_opportunities_pair", true);
    await index(queryInterface, "capital_opportunities", ["stage", "status"], "capital_opportunities_stage");
    await index(queryInterface, "capital_opportunities", ["assignedManagerId"], "capital_opportunities_manager");

    // ---- Introductions (both directions pass through the manager) -----------
    await queryInterface.createTable("capital_introductions", {
      id: id(S),
      uuid: uuid(S),
      capitalOpportunityId: ref(S, "capital_opportunities"),
      capitalRequestId: ref(S, "capital_requests"),
      businessId: ref(S, "Businesses", { allowNull: false, onDelete: "CASCADE" }),
      capitalProviderId: ref(S, "capital_providers", { allowNull: false, onDelete: "CASCADE" }),
      initiatedBy: { type: S.STRING(20), allowNull: false },
      requestedById: ref(S, "Users"),
      requestType: { type: S.STRING(40), allowNull: false, defaultValue: "introduction" },
      message: { type: S.TEXT, allowNull: true },
      editedMessage: { type: S.TEXT, allowNull: true },
      status: { type: S.STRING(40), allowNull: false, defaultValue: "pending_review" },
      enterprisePermission: { type: S.STRING(20), allowNull: true },
      reviewedById: ref(S, "Users"),
      reviewedAt: { type: S.DATE, allowNull: true },
      reviewNote: { type: S.TEXT, allowNull: true },
      scheduledAt: { type: S.DATE, allowNull: true },
      replacedByProviderId: { type: S.INTEGER, allowNull: true },
      legacyInterestId: { type: S.INTEGER, allowNull: true },
      ...stamps(S),
    });
    await index(queryInterface, "capital_introductions", ["status", "createdAt"], "capital_introductions_status");
    await index(queryInterface, "capital_introductions", ["legacyInterestId"], "capital_introductions_legacy", true);

    // ---- Threads and messages -----------------------------------------------
    await queryInterface.createTable("capital_threads", {
      id: id(S),
      uuid: uuid(S),
      capitalOpportunityId: ref(S, "capital_opportunities", { allowNull: false, onDelete: "CASCADE" }),
      kind: { type: S.STRING(30), allowNull: false },
      lastMessageAt: { type: S.DATE, allowNull: true },
      ...stamps(S),
    });
    await index(queryInterface, "capital_threads", ["capitalOpportunityId", "kind"], "capital_threads_unique", true);

    await queryInterface.createTable("capital_messages", {
      id: id(S),
      uuid: uuid(S),
      capitalThreadId: ref(S, "capital_threads", { allowNull: false, onDelete: "CASCADE" }),
      senderId: ref(S, "Users"),
      senderRole: { type: S.STRING(40), allowNull: true },
      body: { type: S.TEXT, allowNull: false },
      originalBody: { type: S.TEXT, allowNull: true },
      status: { type: S.STRING(20), allowNull: false, defaultValue: "delivered" },
      moderatedById: ref(S, "Users"),
      moderatedAt: { type: S.DATE, allowNull: true },
      moderationNote: { type: S.TEXT, allowNull: true },
      isIntervention: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
      ...stamps(S),
    });
    await index(queryInterface, "capital_messages", ["capitalThreadId", "createdAt"], "capital_messages_thread");
    await index(queryInterface, "capital_messages", ["status"], "capital_messages_status");

    // ---- Deal rooms and documents -------------------------------------------
    await queryInterface.createTable("capital_deal_rooms", {
      id: id(S),
      uuid: uuid(S),
      capitalOpportunityId: ref(S, "capital_opportunities", { allowNull: false, onDelete: "CASCADE" }),
      name: { type: S.STRING, allowNull: false },
      status: { type: S.STRING(20), allowNull: false, defaultValue: "open" },
      createdById: ref(S, "Users"),
      ...stamps(S),
    });
    await index(queryInterface, "capital_deal_rooms", ["capitalOpportunityId"], "capital_deal_rooms_unique", true);

    await queryInterface.createTable("capital_documents", {
      id: id(S),
      uuid: uuid(S),
      capitalRequestId: ref(S, "capital_requests"),
      capitalOpportunityId: ref(S, "capital_opportunities"),
      capitalDealRoomId: ref(S, "capital_deal_rooms"),
      businessId: { type: S.INTEGER, allowNull: true },
      category: { type: S.STRING(40), allowNull: false, defaultValue: "other" },
      title: { type: S.STRING, allowNull: false },
      originalName: { type: S.STRING, allowNull: false },
      // The file lives outside the public /files folder; only this name finds it.
      storedName: { type: S.STRING, allowNull: false },
      mimeType: { type: S.STRING(120), allowNull: true },
      sizeBytes: { type: S.INTEGER, allowNull: true },
      visibility: { type: S.STRING(20), allowNull: false, defaultValue: "internal" },
      version: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
      replacesDocumentId: { type: S.INTEGER, allowNull: true },
      uploadedById: ref(S, "Users"),
      deletedAt: { type: S.DATE, allowNull: true },
      deletedById: { type: S.INTEGER, allowNull: true },
      ...stamps(S),
    });
    await index(queryInterface, "capital_documents", ["capitalOpportunityId"], "capital_documents_opportunity");
    await index(queryInterface, "capital_documents", ["capitalRequestId"], "capital_documents_request");

    // ---- Due diligence ------------------------------------------------------
    await queryInterface.createTable("capital_dd_items", {
      id: id(S),
      uuid: uuid(S),
      capitalOpportunityId: ref(S, "capital_opportunities", { allowNull: false, onDelete: "CASCADE" }),
      category: { type: S.STRING(40), allowNull: false },
      requirement: { type: S.TEXT, allowNull: false },
      status: { type: S.STRING(30), allowNull: false, defaultValue: "not_started" },
      responsibleParty: { type: S.STRING(20), allowNull: false, defaultValue: "enterprise" },
      capitalDocumentId: ref(S, "capital_documents"),
      reviewerId: ref(S, "Users"),
      comments: { type: S.TEXT, allowNull: true },
      riskLevel: { type: S.STRING(20), allowNull: false, defaultValue: "low" },
      dueDate: { type: S.DATEONLY, allowNull: true },
      position: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      ...stamps(S),
    });
    await index(queryInterface, "capital_dd_items", ["capitalOpportunityId", "category"], "capital_dd_items_opportunity");

    // ---- Interventions, notes, settings, reminders --------------------------
    await queryInterface.createTable("capital_interventions", {
      id: id(S),
      uuid: uuid(S),
      capitalOpportunityId: ref(S, "capital_opportunities", { allowNull: false, onDelete: "CASCADE" }),
      action: { type: S.STRING(40), allowNull: false },
      reason: { type: S.TEXT, allowNull: false },
      comments: { type: S.TEXT, allowNull: true },
      previousStatus: { type: S.STRING(60), allowNull: true },
      newStatus: { type: S.STRING(60), allowNull: true },
      userId: ref(S, "Users"),
      ...stamps(S),
    });
    await index(queryInterface, "capital_interventions", ["capitalOpportunityId", "createdAt"], "capital_interventions_opportunity");

    await queryInterface.createTable("capital_notes", {
      id: id(S),
      uuid: uuid(S),
      subjectType: { type: S.STRING(20), allowNull: false },
      subjectId: { type: S.INTEGER, allowNull: false },
      body: { type: S.TEXT, allowNull: false },
      authorId: ref(S, "Users"),
      ...stamps(S),
    });
    await index(queryInterface, "capital_notes", ["subjectType", "subjectId"], "capital_notes_subject");

    await queryInterface.createTable("capital_settings", {
      id: id(S),
      key: { type: S.STRING(80), allowNull: false, unique: true },
      value: { type: S.TEXT, allowNull: true },
      updatedById: { type: S.INTEGER, allowNull: true },
      ...stamps(S),
    });

    await queryInterface.createTable("capital_reminders", {
      id: id(S),
      key: { type: S.STRING(191), allowNull: false, unique: true },
      ...stamps(S),
    });

    // ---- Seed permissions, role grants, settings ----------------------------
    const now = new Date();
    // Node's own generator: the uuid package is not a declared dependency.
    const v4 = () => require("crypto").randomUUID();

    for (const [key, description] of PERMISSIONS) {
      await queryInterface.sequelize.query(
        "INSERT IGNORE INTO Permissions (uuid, name, description, `key`, module, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'capital', ?, ?)",
        { replacements: [v4(), key, description, key, now, now] },
      );
    }

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id, `key` FROM Permissions WHERE module = 'capital'",
    );
    const idOf = new Map(rows.map((row) => [row.key, row.id]));

    const grant = async (role, key) =>
      queryInterface.sequelize.query(
        "INSERT IGNORE INTO role_permissions (uuid, role, permissionId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
        { replacements: [v4(), role, idOf.get(key), now, now] },
      );

    for (const [key] of PERMISSIONS) await grant("CFM", key);
    for (const key of ADMIN_DEFAULTS) await grant("Admin", key);

    for (const [key, value] of [
      ["staleOpportunityDays", "14"],
      ["meetingReminderHours", "24"],
    ]) {
      await queryInterface.sequelize.query(
        "INSERT IGNORE INTO capital_settings (`key`, value, createdAt, updatedAt) VALUES (?, ?, ?, ?)",
        { replacements: [key, value, now, now] },
      );
    }
  },

  async down(queryInterface) {
    for (const table of [
      "capital_reminders",
      "capital_settings",
      "capital_notes",
      "capital_interventions",
      "capital_dd_items",
      "capital_documents",
      "capital_deal_rooms",
      "capital_messages",
      "capital_threads",
      "capital_introductions",
      "capital_opportunities",
      "capital_requests",
      "capital_providers",
      "role_permissions",
    ]) {
      await queryInterface.dropTable(table);
    }

    await queryInterface.sequelize.query("DELETE FROM Permissions WHERE module = 'capital'");
    await queryInterface.removeIndex("Permissions", "permissions_key").catch(() => {});
    await queryInterface.removeColumn("Permissions", "module");
    await queryInterface.removeColumn("Permissions", "key");

    await queryInterface.removeColumn("Notifications", "link");
    await queryInterface.removeColumn("Notifications", "type");

    // Rolling back removes the capital audit trail with the feature it audited.
    await queryInterface.sequelize.query("DELETE FROM Logs WHERE module = 'capital'");
    await queryInterface.removeIndex("Logs", "logs_capital_opportunity").catch(() => {});
    await queryInterface.removeIndex("Logs", "logs_module_created").catch(() => {});
    for (const column of ["newValue", "oldValue", "capitalProviderId", "businessId", "capitalOpportunityId", "role", "module"]) {
      await queryInterface.removeColumn("Logs", column);
    }
    await queryInterface.sequelize.query(
      "ALTER TABLE Logs MODIFY actionType ENUM('login','crat_update','module_start','resource_access','other') NOT NULL",
    );
  },
};
