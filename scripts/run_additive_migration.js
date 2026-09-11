"use strict";

const path = require("path");
const db = require("../models");

const filename = process.argv[2];
if (!/^\d{14}-[a-z0-9-]+\.js$/i.test(filename || "")) {
  console.error("Usage: node scripts/run_additive_migration.js <migration-file.js>");
  process.exit(1);
}

async function main() {
  await db.sequelize.authenticate();
  const [applied] = await db.sequelize.query(
    "SELECT name FROM SequelizeMeta WHERE name = ?",
    { replacements: [filename] },
  );
  if (applied.length) return console.log("Migration already applied.");

  const migration = require(path.join("..", "migrations", filename));
  await migration.up(db.sequelize.getQueryInterface(), db.Sequelize);
  await db.sequelize.query("INSERT INTO SequelizeMeta (name) VALUES (?)", {
    replacements: [filename],
  });
  console.log(`Applied and registered ${filename}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => db.sequelize.close());
