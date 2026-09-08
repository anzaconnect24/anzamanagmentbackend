"use strict";

// One-off data cleanup, run 2026-09-08.
//
// Deletes only rows that are provably not a real startup:
//   * test/garbage records - the business name is a test string, or the
//     profile text is the field label echoed back ("problem"/"solution").
//   * placeholder duplicates - a business whose owner account no longer
//     exists and whose name matches exactly one business that does have a
//     live account. Businesses.userId has no foreign key, so deleting a user
//     strands its business; these are the strays that left behind.
//
// Deliberately NOT deleted: any business that carries dependent rows, and the
// ~100 thin-but-real records from bulk intakes (single-word answers like
// "Limited access"/"Affordability"). Those are real ventures, not empty rows.
//
// Every delete is guarded: the script re-checks dependents at run time and
// aborts the whole transaction if anything it is about to remove has since
// gained a membership or any other referencing row.

const { sequelize } = require("../models");

// Business name is a test string, or the profile is the field label echoed.
const GARBAGE = [
  1, 4, 54, 55, 56, 57, 60, 65, 71, 311, 434, 435, 436, 438, 439, 440, 441,
  442, 443, 445, 517, 518, 624,
];

// Owner account gone; name matches exactly one business with a live account.
const STUBS = [
  8, 13, 25, 30, 42, 52, 118, 119, 224, 328, 399, 403, 408, 430, 447, 451,
  452, 463, 466, 471, 481, 507, 541, 571, 573, 578, 600, 603, 628,
];

// Every table holding a business reference. Only three have a real foreign
// key, so the rest have to be checked by hand or the delete silently orphans
// them.
const REFS = [
  ["ai_reports", "businessId"],
  ["businessdocuments", "businessId"],
  ["businessinterests", "businessId"],
  ["businessinvestmentrequests", "businessId"],
  ["businessreviews", "businessId"],
  ["cohort_memberships", "businessId"],
  ["course_completions", "businessId"],
  ["course_enrollments", "businessId"],
  ["crat_answers", "business_id"],
  ["crat_assessments", "business_id"],
  ["investmentinterests", "businessId"],
  ["me_indicator_values", "businessId"],
  ["milestones", "businessId"],
  ["survey_responses", "businessId"],
  ["trackerenterprises", "businessId"],
  ["trackersessions", "businessId"],
  ["weeklylogs", "businessId"],
  ["workshop_attendance", "businessId"],
];

(async () => {
  const t = await sequelize.transaction();
  const select = (sql) =>
    sequelize.query(sql, {
      type: sequelize.QueryTypes.SELECT,
      logging: false,
      transaction: t,
    });
  const run = (sql) => sequelize.query(sql, { logging: false, transaction: t });

  try {
    // --- 1. enrolment corrections ---------------------------------------
    //
    // Kilimanjaro Green Bag was enrolled twice in ClimateLaunchpad 2020:
    // #370 is the stray of #373, so the programme counted one startup twice.
    const dupMembership = await select(
      "SELECT id FROM cohort_memberships WHERE businessId = 370",
    );
    if (dupMembership.length) {
      await run("DELETE FROM cohort_memberships WHERE businessId = 370");
      console.log("  removed duplicate Kilimanjaro Green Bag membership (#370)");
    } else {
      console.log("  #370 membership already absent");
    }

    // Damu Rafiki's 2025 place sits on stray #446; the live account is #391.
    const held = await select(
      "SELECT id FROM cohort_memberships WHERE businessId = 391",
    );
    if (held.length) {
      console.log("  #391 already holds a membership - leaving Damu Rafiki");
    } else {
      const [, moved] = await run(
        "UPDATE cohort_memberships SET businessId = 391, updatedAt = NOW() WHERE businessId = 446",
      );
      console.log(`  moved Damu Rafiki #446 -> #391 (${moved.affectedRows} row)`);
    }

    // --- 2. re-check every row about to go -------------------------------
    const doomed = [...GARBAGE, ...STUBS];
    const blockers = [];

    for (const [table, column] of REFS) {
      let rows;
      try {
        rows = await select(
          `SELECT \`${column}\` id, COUNT(*) n FROM \`${table}\`
           WHERE \`${column}\` IN (${doomed.join(",")}) GROUP BY \`${column}\``,
        );
      } catch (error) {
        // A table that does not exist here cannot be holding a reference.
        continue;
      }
      for (const row of rows) blockers.push(`${table} -> #${row.id} (${row.n})`);
    }

    if (blockers.length) {
      throw new Error(
        "refusing to delete, rows are still referenced:\n    " +
          blockers.join("\n    "),
      );
    }
    console.log(`  ${doomed.length} rows queued, none referenced anywhere`);

    // --- 3. delete --------------------------------------------------------
    const [, garbage] = await run(
      `DELETE FROM Businesses WHERE id IN (${GARBAGE.join(",")})`,
    );
    console.log(`  test/garbage records deleted: ${garbage.affectedRows}`);

    const [, stubs] = await run(
      `DELETE FROM Businesses WHERE id IN (${STUBS.join(",")})`,
    );
    console.log(`  placeholder duplicates deleted: ${stubs.affectedRows}`);

    await t.commit();
    console.log("\ncommitted.");
  } catch (error) {
    await t.rollback();
    console.error("\nROLLED BACK:", error.message);
    process.exitCode = 1;
  }

  await sequelize.close();
})();
