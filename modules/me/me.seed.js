// Demonstration M&E framework for one programme.
//
// Run with: node modules/me/me.seed.js "<programme uuid>"
//
// Builds the results framework and indicator registry from the spec's sample
// programme. Indicators that the platform can already answer are wired to
// their automatic source rather than given a made-up actual, so the dashboard
// reflects the real roster from the first load. Only the figures the platform
// genuinely cannot know are seeded as reported values.

require("dotenv").config();

const {
  MeFramework,
  MeResult,
  MeIndicator,
  MeIndicatorValue,
  CohortProgram,
  sequelize,
} = require("../../models");

const FRAMEWORK = {
  goal: "Increase growth and investment readiness of supported enterprises.",
  outcomes: [
    {
      code: "Outcome 1",
      title: "Enterprises improve business management capabilities.",
      outputs: [
        {
          code: "Output 1.1",
          title:
            "Enterprises receive structured capacity-building support.",
          indicators: [
            {
              code: "OP1.1a",
              name: "Number of enterprises trained",
              resultLevel: "output",
              indicatorType: "number",
              unit: "enterprises",
              dataSource: "enterprises_enrolled",
              frequency: "quarterly",
              targetValue: 20,
              verificationMethod: "Programme roster",
            },
            {
              code: "OP1.1b",
              name: "Enterprises completing the programme",
              resultLevel: "output",
              indicatorType: "number",
              unit: "enterprises",
              dataSource: "enterprises_completed_modules",
              frequency: "endline",
              baselineValue: 0,
              targetValue: 20,
              verificationMethod: "Learning records",
            },
          ],
        },
      ],
      indicators: [
        {
          code: "OC1a",
          name: "Average improvement in business diagnostic score",
          resultLevel: "outcome",
          indicatorType: "percentage",
          unit: "%",
          dataSource: "investment_readiness",
          frequency: "semi_annual",
          baselineValue: 46,
          targetValue: 70,
          verificationMethod: "CRAT assessment",
        },
      ],
    },
    {
      code: "Outcome 2",
      title:
        "Enterprises improve financial and commercial performance.",
      indicators: [
        {
          code: "OC2a",
          name: "Enterprises increasing revenue",
          resultLevel: "outcome",
          indicatorType: "number",
          unit: "enterprises",
          dataSource: "enterprises_growing_revenue",
          frequency: "quarterly",
          targetValue: 15,
          verificationMethod: "Management accounts",
        },
        {
          code: "OC2b",
          name: "Jobs created",
          resultLevel: "outcome",
          indicatorType: "number",
          unit: "jobs",
          dataSource: "jobs_created",
          frequency: "quarterly",
          baselineValue: 0,
          targetValue: 100,
          verificationMethod: "Payroll and employment contracts",
        },
        {
          code: "OC2c",
          name: "Number of new customers",
          resultLevel: "outcome",
          indicatorType: "number",
          unit: "customers",
          dataSource: "total_customers",
          frequency: "quarterly",
          targetValue: 1000,
          verificationMethod: "Sales reports",
        },
      ],
    },
    {
      code: "Outcome 3",
      title: "Enterprises improve access to capital.",
      indicators: [
        {
          code: "OC3a",
          name: "Enterprises accessing capital",
          resultLevel: "outcome",
          indicatorType: "number",
          unit: "enterprises",
          dataSource: "enterprises_accessing_capital",
          frequency: "quarterly",
          baselineValue: 0,
          targetValue: 10,
          verificationMethod: "Investment and loan agreements",
        },
        {
          code: "OC3b",
          name: "Capital facilitated",
          resultLevel: "outcome",
          indicatorType: "currency",
          unit: "USD",
          dataSource: "capital_raised",
          frequency: "quarterly",
          baselineValue: 0,
          targetValue: 250000,
          verificationMethod: "Signed agreements and bank statements",
        },
        {
          // The platform holds no record of financing raised outside it, so
          // this one is genuinely manual.
          code: "OC3c",
          name: "External financing secured",
          resultLevel: "outcome",
          indicatorType: "currency",
          unit: "USD",
          dataSource: "manual",
          frequency: "semi_annual",
          baselineValue: 0,
          targetValue: 120000,
          verificationMethod: "Financing agreements",
          seedValue: 84000,
        },
      ],
    },
  ],
};

const run = async () => {
  const uuid = process.argv[2];

  if (!uuid) {
    console.error('Usage: node modules/me/me.seed.js "<programme uuid>"');
    process.exit(1);
  }

  const programme = await CohortProgram.findOne({ where: { uuid } });

  if (!programme) {
    console.error("No programme with uuid " + uuid);
    process.exit(1);
  }

  const transaction = await sequelize.transaction();

  try {
    const [framework] = await MeFramework.findOrCreate({
      where: { cohortProgramId: programme.id },
      defaults: { cohortProgramId: programme.id },
      transaction,
    });

    await framework.update({ goal: FRAMEWORK.goal }, { transaction });

    let created = 0;

    const addIndicator = async (spec, resultId, position) => {
      const { seedValue, ...fields } = spec;

      const indicator = await MeIndicator.create(
        {
          ...fields,
          cohortProgramId: programme.id,
          resultId,
          position,
        },
        { transaction },
      );

      // Only manual indicators carry a seeded figure; the rest are computed.
      if (seedValue !== undefined) {
        await MeIndicatorValue.create(
          {
            indicatorId: indicator.id,
            value: seedValue,
            origin: "manual",
            verificationStatus: "verified",
            verifiedValue: seedValue,
            verifiedAt: new Date(),
            submittedAt: new Date(),
          },
          { transaction },
        );
      }

      created += 1;
    };

    let position = 0;

    for (const [index, outcome] of FRAMEWORK.outcomes.entries()) {
      const outcomeRow = await MeResult.create(
        {
          frameworkId: framework.id,
          level: "outcome",
          code: outcome.code,
          title: outcome.title,
          position: index,
        },
        { transaction },
      );

      for (const spec of outcome.indicators || []) {
        await addIndicator(spec, outcomeRow.id, position++);
      }

      for (const [outputIndex, output] of (outcome.outputs || []).entries()) {
        const outputRow = await MeResult.create(
          {
            frameworkId: framework.id,
            parentId: outcomeRow.id,
            level: "output",
            code: output.code,
            title: output.title,
            position: outputIndex,
          },
          { transaction },
        );

        for (const spec of output.indicators || []) {
          await addIndicator(spec, outputRow.id, position++);
        }
      }
    }

    await transaction.commit();

    console.log("Seeded the M&E framework for " + programme.title);
    console.log("  outcomes:   " + FRAMEWORK.outcomes.length);
    console.log("  indicators: " + created);
  } catch (error) {
    await transaction.rollback();
    console.error("Seeding failed:", error.message);
    process.exit(1);
  }

  process.exit(0);
};

run();
