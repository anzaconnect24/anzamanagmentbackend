"use strict";

// Business tool category names dropped "&" in favour of "and" (frontend:
// src/constants/learnAndGrowCategories.js). Category is a free-text STRING
// matched by exact equality, so rows holding the old names would fall into
// the "Uncategorized" bucket until they are renamed here.
const RENAMES = [
  ["Finance & Accounting", "Finance and Accounting"],
  ["Fundraising & Investment", "Fundraising and Investment"],
  ["Market & Growth", "Market and Growth"],
  ["Sales & Business Development", "Sales and Business Development"],
  ["Human Resource & Team Management", "Human Resource and Team Management"],
  ["Legal & Compliance", "Legal and Compliance"],
  ["Governance & Management", "Governance and Management"],
];

const rename = async (queryInterface, pairs) => {
  for (const [from, to] of pairs) {
    await queryInterface.sequelize.query(
      "UPDATE business_tools SET category = :to WHERE category = :from",
      { replacements: { from, to } },
    );
  }
};

module.exports = {
  async up(queryInterface) {
    await rename(queryInterface, RENAMES);
  },

  async down(queryInterface) {
    await rename(
      queryInterface,
      RENAMES.map(([from, to]) => [to, from]),
    );
  },
};
