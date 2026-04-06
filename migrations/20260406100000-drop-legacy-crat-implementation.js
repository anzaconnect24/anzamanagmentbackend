"use strict";

const LEGACY_TABLES = [
  "crat_financials",
  "crat_markets",
  "crat_operations",
  "crat_legals",
  "crat_reviews",
  "CratFinancials",
  "CratMarkets",
  "CratOperations",
  "CratLegals",
  "CratReviews",
];

const normalizeTables = (tables) =>
  tables.map((table) => {
    if (typeof table === "string") return table;
    if (table.tableName) return table.tableName;
    return Object.values(table)[0];
  });

module.exports = {
  async up(queryInterface) {
    const existingTables = normalizeTables(
      await queryInterface.showAllTables(),
    );

    for (const tableName of LEGACY_TABLES) {
      if (existingTables.includes(tableName)) {
        await queryInterface.dropTable(tableName);
      }
    }
  },

  async down() {
    // Legacy teardown is intentionally irreversible in clean rebuild mode.
  },
};
