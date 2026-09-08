// The M&E calculation engine.
//
// Every figure the module reports goes through here, so achievement, growth
// and compliance mean the same thing on every screen and in every export.
// Nothing in this file touches the database — it is pure arithmetic, which is
// what makes it testable (see me.calculations.test.js).
//
// Every function returns null rather than 0, NaN or Infinity when the answer
// is genuinely unknown: no target set, no baseline to compare against, nothing
// expected yet. A null means "not enough information", and the UI shows it as
// a dash instead of inventing a number.

// Number(null) is 0 and Number("") is 0, which would silently turn missing
// data into a real zero. This only accepts something that is actually numeric.
const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const round = (value, places = 0) => {
  if (value === null) return null;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

// actual / target x 100.
//
// When a lower number is the better result (dropout rate, days to
// disbursement) the ratio is inverted, so beating the target still reads as
// over 100% rather than as a failure.
const achievementPercent = (actual, target, { higherIsBetter = true } = {}) => {
  const a = toNumber(actual);
  const t = toNumber(target);

  if (a === null || t === null) return null;

  if (higherIsBetter) {
    // No target to measure against. Any actual above zero is progress, but
    // there is no percentage to express it as.
    if (t === 0) return null;
    return round((a / t) * 100, 1);
  }

  // Lower is better. Hitting zero when zero was the target is full
  // achievement; hitting zero when the target was higher beat it outright.
  if (a === 0) return t === 0 ? 100 : 100;
  return round((t / a) * 100, 1);
};

// (current - previous) / previous x 100. Null when there is no previous
// figure, or when it was zero — growth from nothing has no percentage.
const growthPercent = (current, previous) => {
  const c = toNumber(current);
  const p = toNumber(previous);

  if (c === null || p === null || p === 0) return null;
  return round(((c - p) / p) * 100, 1);
};

// current - baseline, in whatever unit the indicator uses.
const absoluteChange = (current, baseline) => {
  const c = toNumber(current);
  const b = toNumber(baseline);

  if (c === null || b === null) return null;
  return round(c - b, 2);
};

// For indicators already expressed as a percentage, the honest comparison is
// the difference in percentage points, not the percentage change between them.
const percentagePointChange = (endline, baseline) => {
  const e = toNumber(endline);
  const b = toNumber(baseline);

  if (e === null || b === null) return null;
  return round(e - b, 1);
};

// submitted / expected x 100. Null when nothing was expected yet, which is
// different from nobody having reported.
const compliancePercent = (submitted, expected) => {
  const s = toNumber(submitted);
  const e = toNumber(expected);

  if (s === null || e === null || e === 0) return null;
  return round((s / e) * 100, 1);
};

// completed / planned x 100.
const completionPercent = (completed, planned) => {
  const c = toNumber(completed);
  const p = toNumber(planned);

  if (c === null || p === null || p === 0) return null;
  return round((c / p) * 100, 1);
};

// How much capital each unit of programme money brought in.
const capitalLeverage = (capitalFacilitated, programmeInvestment) => {
  const c = toNumber(capitalFacilitated);
  const i = toNumber(programmeInvestment);

  if (c === null || i === null || i === 0) return null;
  return round(c / i, 2);
};

// The default thresholds, overridable per programme on its framework.
const DEFAULT_THRESHOLDS = { onTrack: 90, attention: 70 };

const STATUSES = {
  ON_TRACK: "on_track",
  ATTENTION: "attention",
  BEHIND: "behind",
  NOT_DUE: "not_due",
};

// Green / amber / red / grey.
//
// Grey wins over everything: an indicator whose target date has not arrived is
// not behind, it simply is not due yet. An indicator with no figure at all is
// also grey rather than red, because no data is not the same as bad data.
const indicatorStatus = (
  achievement,
  { onTrack, attention } = DEFAULT_THRESHOLDS,
  { targetDate = null, hasActual = true, now = new Date() } = {},
) => {
  if (targetDate) {
    const due = new Date(targetDate);
    if (!Number.isNaN(due.getTime()) && due > now) return STATUSES.NOT_DUE;
  }

  if (!hasActual || achievement === null) return STATUSES.NOT_DUE;

  const green = toNumber(onTrack) ?? DEFAULT_THRESHOLDS.onTrack;
  const amber = toNumber(attention) ?? DEFAULT_THRESHOLDS.attention;

  if (achievement >= green) return STATUSES.ON_TRACK;
  if (achievement >= amber) return STATUSES.ATTENTION;
  return STATUSES.BEHIND;
};

// The share of a programme's indicators that are on track, used as the single
// "programme progress" figure. Indicators that are not yet due are left out of
// both halves, so an early programme is not punished for having nothing due.
const programmeProgressPercent = (statuses = []) => {
  const scored = statuses.filter((status) => status !== STATUSES.NOT_DUE);
  if (scored.length === 0) return null;

  const onTrack = scored.filter(
    (status) => status === STATUSES.ON_TRACK,
  ).length;

  return round((onTrack / scored.length) * 100, 1);
};

// A blunt but honest data quality score: the share of expected figures that
// are present, verified and unflagged. Each component is a ratio of counts.
const dataQualityScore = ({
  expected = 0,
  present = 0,
  verified = 0,
  flagged = 0,
} = {}) => {
  const e = toNumber(expected);
  if (e === null || e === 0) return null;

  const complete = Math.min(toNumber(present) ?? 0, e) / e;
  const trusted = Math.min(toNumber(verified) ?? 0, e) / e;
  const clean = 1 - Math.min(toNumber(flagged) ?? 0, e) / e;

  // Completeness and verification carry the score; anomalies drag it down.
  return round(((complete + trusted + clean) / 3) * 100, 1);
};

module.exports = {
  toNumber,
  round,
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
  DEFAULT_THRESHOLDS,
  STATUSES,
};
