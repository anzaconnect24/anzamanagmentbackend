/* eslint-disable no-console */
require("dotenv").config();
const { sequelize, CratQuestionCatalog } = require("../models");

// NOTE: Question-level weights are intentionally omitted by design.
const seedRows = [
  {
    domain: "commercial_marketing",
    variant: "default",
    question_code: "CM-001",
    question_text_en: "Customer demand evidence",
    question_text_sw: "Ushahidi wa mahitaji ya wateja",
    sort_order: 1,
  },
  {
    domain: "financial",
    variant: "default",
    question_code: "FI-001",
    question_text_en: "Revenue quality and consistency",
    question_text_sw: "Ubora na uthabiti wa mapato",
    sort_order: 1,
  },
  {
    domain: "operations",
    variant: "default",
    question_code: "OP-001",
    question_text_en: "Operational capacity and controls",
    question_text_sw: "Uwezo wa uendeshaji na udhibiti",
    sort_order: 1,
  },
  {
    domain: "legal_compliance",
    variant: "default",
    question_code: "LE-001",
    question_text_en: "Business registration and legal standing",
    question_text_sw: "Usajili wa biashara na uhalali wa kisheria",
    sort_order: 1,
  },
  {
    domain: "legal_compliance",
    variant: "fintech",
    question_code: "LE-FIN-001",
    question_text_en: "Financial services regulatory licensing",
    question_text_sw: "Leseni za udhibiti wa huduma za kifedha",
    sort_order: 1,
  },
];

const run = async () => {
  try {
    await sequelize.authenticate();

    for (const row of seedRows) {
      await CratQuestionCatalog.upsert({
        ...row,
        guidance_en: null,
        guidance_sw: null,
        is_active: true,
      });
    }

    console.log(`Seeded ${seedRows.length} CRAT catalog rows.`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed CRAT catalog:", error);
    process.exit(1);
  }
};

run();
