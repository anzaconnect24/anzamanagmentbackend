"use strict";

// The category each programme belongs to, as decided by the Anza team.
// Listed explicitly by title rather than using a catch-all, so a programme an
// Admin created outside this list is never silently recategorised.
const CATEGORY_BY_TITLE = {
  "Climate Launchpad": "Ideation",

  "Funguo Investment Accelerator": "Investment Readiness Accelerator",
  "Pesatech Accelerator Two": "Investment Readiness Accelerator",
  "Pesatech Accelerator 3": "Investment Readiness Accelerator",
  "AWCE Investment Accelerator": "Investment Readiness Accelerator",
  "Regenerative Economy Accelerator Tanzania":
    "Investment Readiness Accelerator",

  "Generation Food": "Business Foundation Accelerator",
  "Capacity Building to Kilwa Entrepreneurs": "Business Foundation Accelerator",
  "Female Entrepreneurs Growing Greener Economies":
    "Business Foundation Accelerator",
  "Rapid Banana": "Business Foundation Accelerator",
  "Restoration Factory Tanzania": "Business Foundation Accelerator",
  "Capacity Building to Entrepreneurs focusing on Clean and Renewable Energy in Arusha":
    "Business Foundation Accelerator",
  "Capacity Building for Entrepreneurship and Aquaculture Practices":
    "Business Foundation Accelerator",
  "Youth Entrepreneurship & Innovation Program":
    "Business Foundation Accelerator",
};

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    for (const [title, category] of Object.entries(CATEGORY_BY_TITLE)) {
      await sequelize.query(
        "UPDATE cohort_programs SET category = :category WHERE title = :title",
        { replacements: { category, title } },
      );
    }
  },

  // Categories were unset before this ran; putting them back would be less
  // correct than leaving them, so this is deliberately a no-op.
  async down() {},
};
