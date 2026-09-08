// Tests for the M&E calculation engine. Run with: node modules/me/me.calculations.test.js
//
// No test runner is configured in this project, so these are plain assertions
// and the file exits non-zero on the first failure.

const assert = require("assert");
const {
  achievementPercent,
  growthPercent,
  absoluteChange,
  percentagePointChange,
  compliancePercent,
  completionPercent,
  capitalLeverage,
  indicatorStatus,
  programmeProgressPercent,
  dataQualityScore,
  STATUSES,
} = require("./me.calculations");

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  console.log("  ok  " + name);
};

console.log("achievement");

check("actual over target", () => {
  assert.strictEqual(achievementPercent(45, 50), 90);
  assert.strictEqual(achievementPercent(7, 10), 70);
  assert.strictEqual(achievementPercent(62, 100), 62);
  assert.strictEqual(achievementPercent(210000, 250000), 84);
});

check("exceeding the target goes above 100", () => {
  assert.strictEqual(achievementPercent(60, 50), 120);
});

check("a zero target has no percentage", () => {
  assert.strictEqual(achievementPercent(5, 0), null);
});

check("missing figures give null, never zero", () => {
  assert.strictEqual(achievementPercent(null, 50), null);
  assert.strictEqual(achievementPercent(45, null), null);
  assert.strictEqual(achievementPercent("", 50), null);
  assert.strictEqual(achievementPercent("abc", 50), null);
});

check("a real zero actual is 0%, not null", () => {
  assert.strictEqual(achievementPercent(0, 50), 0);
});

check("lower-is-better indicators invert the ratio", () => {
  // Target 5% dropout, actual 4% — better than asked for.
  assert.strictEqual(
    achievementPercent(4, 5, { higherIsBetter: false }),
    125,
  );
  // Actual 10% against a 5% target — half as good.
  assert.strictEqual(achievementPercent(10, 5, { higherIsBetter: false }), 50);
});

console.log("growth and change");

check("growth percent", () => {
  assert.strictEqual(growthPercent(165, 120), 37.5);
  assert.strictEqual(growthPercent(520, 340), 52.9);
});

check("growth from zero is undefined, not infinite", () => {
  assert.strictEqual(growthPercent(100, 0), null);
});

check("decline reads negative", () => {
  assert.strictEqual(growthPercent(40, 50), -20);
});

check("absolute change", () => {
  assert.strictEqual(absoluteChange(12, 8), 4);
  assert.strictEqual(absoluteChange(5, 30), -25);
  assert.strictEqual(absoluteChange(null, 8), null);
});

check("percentage points, not percentage change", () => {
  // 44% to 69% is +25 points, not +56.8%.
  assert.strictEqual(percentagePointChange(69, 44), 25);
  assert.strictEqual(percentagePointChange(71, 38), 33);
});

console.log("compliance and completion");

check("reporting compliance", () => {
  assert.strictEqual(compliancePercent(17, 20), 85);
});

check("nothing expected yet is null, not 0% or 100%", () => {
  assert.strictEqual(compliancePercent(0, 0), null);
});

check("nobody reported is a real 0%", () => {
  assert.strictEqual(compliancePercent(0, 20), 0);
});

check("completion and leverage", () => {
  assert.strictEqual(completionPercent(18, 20), 90);
  assert.strictEqual(completionPercent(3, 0), null);
  assert.strictEqual(capitalLeverage(210000, 50000), 4.2);
  assert.strictEqual(capitalLeverage(210000, 0), null);
});

console.log("status");

const thresholds = { onTrack: 90, attention: 70 };
const past = "2020-01-01";

check("default thresholds", () => {
  assert.strictEqual(
    indicatorStatus(90, thresholds, { targetDate: past }),
    STATUSES.ON_TRACK,
  );
  assert.strictEqual(
    indicatorStatus(89.9, thresholds, { targetDate: past }),
    STATUSES.ATTENTION,
  );
  assert.strictEqual(
    indicatorStatus(70, thresholds, { targetDate: past }),
    STATUSES.ATTENTION,
  );
  assert.strictEqual(
    indicatorStatus(69.9, thresholds, { targetDate: past }),
    STATUSES.BEHIND,
  );
});

check("a target date in the future is not due, whatever the number", () => {
  assert.strictEqual(
    indicatorStatus(10, thresholds, { targetDate: "2099-01-01" }),
    STATUSES.NOT_DUE,
  );
});

check("no actual is grey, not red", () => {
  assert.strictEqual(
    indicatorStatus(null, thresholds, { targetDate: past, hasActual: false }),
    STATUSES.NOT_DUE,
  );
});

check("programmes can override the thresholds", () => {
  assert.strictEqual(
    indicatorStatus(80, { onTrack: 75, attention: 50 }, { targetDate: past }),
    STATUSES.ON_TRACK,
  );
});

console.log("aggregates");

check("programme progress ignores what is not due", () => {
  const statuses = [
    STATUSES.ON_TRACK,
    STATUSES.ON_TRACK,
    STATUSES.BEHIND,
    STATUSES.ATTENTION,
    STATUSES.NOT_DUE,
  ];
  // 2 on track out of the 4 that are actually due.
  assert.strictEqual(programmeProgressPercent(statuses), 50);
});

check("a programme with nothing due yet has no progress figure", () => {
  assert.strictEqual(
    programmeProgressPercent([STATUSES.NOT_DUE, STATUSES.NOT_DUE]),
    null,
  );
  assert.strictEqual(programmeProgressPercent([]), null);
});

check("data quality score", () => {
  // Everything present, everything verified, nothing flagged.
  assert.strictEqual(
    dataQualityScore({ expected: 10, present: 10, verified: 10, flagged: 0 }),
    100,
  );
  // Half present, none verified, nothing flagged.
  assert.strictEqual(
    dataQualityScore({ expected: 10, present: 5, verified: 0, flagged: 0 }),
    50,
  );
  assert.strictEqual(dataQualityScore({ expected: 0 }), null);
});

console.log();
console.log(passed + " checks passed");
