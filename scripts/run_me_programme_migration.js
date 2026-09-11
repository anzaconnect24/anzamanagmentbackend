"use strict";

const db = require("../models");
const migration = require("../migrations/20260909100000-extend-programmes-and-participation");

const MIGRATION = "20260909100000-extend-programmes-and-participation.js";
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
const backups = {
  programmes: `backup_cohort_programs_${stamp}`,
  memberships: `backup_cohort_memberships_${stamp}`,
};

const quote = (name) => `\`${String(name).replace(/`/g, "``")}\``;

async function tableExists(name) {
  const [rows] = await db.sequelize.query(
    "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
    { replacements: [name] },
  );
  return Number(rows[0].count) > 0;
}

async function main() {
  await db.sequelize.authenticate();
  const queryInterface = db.sequelize.getQueryInterface();

  const definition = await queryInterface.describeTable("cohort_programs");
  if (definition.parentProgrammeId) {
    console.log("Migration already applied; no database changes made.");
    return;
  }

  for (const [source, target] of [
    ["cohort_programs", backups.programmes],
    ["cohort_memberships", backups.memberships],
  ]) {
    await db.sequelize.query(`CREATE TABLE ${quote(target)} LIKE ${quote(source)}`);
    await db.sequelize.query(`INSERT INTO ${quote(target)} SELECT * FROM ${quote(source)}`);
  }
  console.log(`Backups created: ${backups.programmes}, ${backups.memberships}`);

  try {
    await migration.up(queryInterface, db.Sequelize);
    if (await tableExists("SequelizeMeta")) {
      const [existing] = await db.sequelize.query(
        "SELECT name FROM SequelizeMeta WHERE name = ?",
        { replacements: [MIGRATION] },
      );
      if (!existing.length) {
        await db.sequelize.query("INSERT INTO SequelizeMeta (name) VALUES (?)", {
          replacements: [MIGRATION],
        });
      }
    }

    const programmes = await queryInterface.describeTable("cohort_programs");
    const memberships = await queryInterface.describeTable("cohort_memberships");
    const requiredProgramme = ["parentProgrammeId", "recordType", "objective", "partner", "geographicScope", "programmeManagerId", "reportingFrequency", "targetParticipants", "status", "archivedAt"];
    const requiredMembership = ["enrollmentDate", "completionStatus", "completionDate", "assignedMentorId", "assignedAdvisorId", "baselineCompleted", "endlineCompleted", "attendanceRate", "participationNotes"];
    const missing = [
      ...requiredProgramme.filter((name) => !programmes[name]),
      ...requiredMembership.filter((name) => !memberships[name]),
    ];
    if (missing.length) throw new Error(`Verification failed; missing: ${missing.join(", ")}`);
    console.log("Migration applied and all new columns verified.");
  } catch (error) {
    console.error(`Migration failed. Backups retained as ${backups.programmes} and ${backups.memberships}.`);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.sequelize.close());
