/* eslint-disable no-console */
require("dotenv").config();
const { sequelize, CohortProgram } = require("../models");

// The programmes a startup can say it belongs to. These are the cohorts shown
// on the Startups-by-program grid (Admin/Staff) and offered in the sign-up and
// Edit Profile dropdowns.
//
// They live in cohort_programs, a table this feature owns outright — not the
// shared Programs table used by Class Rooms, Grant Management and the
// Mentorship Tracker. Matching is by title, so re-running this is safe: an
// existing programme is left alone rather than duplicated.
const IDEATION = "Ideation";
const BUSINESS_FOUNDATION = "Business Foundation Accelerator";
const INVESTMENT_READINESS = "Investment Readiness Accelerator";

const COHORT_PROGRAMS = [
  { title: "Climate Launchpad", category: IDEATION },

  { title: "Generation Food", category: BUSINESS_FOUNDATION },
  {
    title: "Capacity Building to Kilwa Entrepreneurs",
    category: BUSINESS_FOUNDATION,
  },
  {
    title: "Female Entrepreneurs Growing Greener Economies",
    category: BUSINESS_FOUNDATION,
  },
  { title: "Rapid Banana", category: BUSINESS_FOUNDATION },
  { title: "Restoration Factory Tanzania", category: BUSINESS_FOUNDATION },
  {
    title:
      "Capacity Building to Entrepreneurs focusing on Clean and Renewable Energy in Arusha",
    category: BUSINESS_FOUNDATION,
  },
  {
    title: "Capacity Building for Entrepreneurship and Aquaculture Practices",
    category: BUSINESS_FOUNDATION,
  },
  {
    title: "Youth Entrepreneurship & Innovation Program",
    category: BUSINESS_FOUNDATION,
  },

  {
    title: "Regenerative Economy Accelerator Tanzania",
    category: INVESTMENT_READINESS,
  },
  { title: "Pesatech Accelerator Two", category: INVESTMENT_READINESS },
  { title: "Funguo Investment Accelerator", category: INVESTMENT_READINESS },
  { title: "AWCE Investment Accelerator", category: INVESTMENT_READINESS },
  { title: "Pesatech Accelerator 3", category: INVESTMENT_READINESS },
];

const DEFAULT_IMAGE = "/images/ideation-classes.svg";

const seed = async () => {
  await sequelize.authenticate();

  let created = 0;
  let categorised = 0;
  let unchanged = 0;

  for (const { title, category } of COHORT_PROGRAMS) {
    const existing = await CohortProgram.findOne({ where: { title } });

    if (!existing) {
      await CohortProgram.create({
        title,
        description: `${title} programme.`,
        image: DEFAULT_IMAGE,
        category,
      });

      created += 1;
      console.log(`  created  ${title}  [${category}]`);
      continue;
    }

    // Fill in a missing category without touching one an Admin has since
    // changed by hand.
    if (!existing.category) {
      await existing.update({ category });
      categorised += 1;
      console.log(`  set cat  ${title}  [${category}]`);
      continue;
    }

    unchanged += 1;
    console.log(`  ok       ${title}`);
  }

  console.log(
    `\ncreated ${created}, categorised ${categorised}, already present ${unchanged}`,
  );
};

seed()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Seeding failed:", error.message);
    await sequelize.close();
    process.exit(1);
  });
