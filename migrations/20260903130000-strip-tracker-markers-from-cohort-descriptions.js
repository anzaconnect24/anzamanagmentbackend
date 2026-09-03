"use strict";

// Cohort descriptions are shown to users verbatim on the programme page.
//
// A programme carried over from the shared Programs table can still hold the
// tracker's metadata markers in its description — Grant Management and the
// Mentorship Tracker store their per-startup JSON inline, and the migration
// that moved cohorts into cohort_programs copied the description as-is. The
// result is a wall of raw JSON under the programme title.
//
// Nothing writes markers into cohort_programs any more (the Admin editor saves
// plain text), so this is a one-off clean-up of what was carried over.
const MARKERS = [
  "__TRACKER_STARTUPS__:",
  "__TRACKER_CATEGORIES__:",
  "__TRACKER_BDAS__:",
  "__TRACKER_COHORT__:",
  "__COURSE_CATEGORIES__:",
  "__COURSE_PROGRAMS__:",
];

// Keep only the human-written text that precedes the first marker.
const clean = (description) => {
  const text = String(description || "");
  const positions = MARKERS.map((marker) => text.indexOf(marker)).filter(
    (index) => index !== -1,
  );

  if (positions.length === 0) return null;

  return text.slice(0, Math.min(...positions)).trim();
};

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    const [rows] = await sequelize.query(
      "SELECT id, description FROM cohort_programs WHERE description IS NOT NULL",
    );

    for (const row of rows) {
      const cleaned = clean(row.description);
      if (cleaned === null || cleaned === row.description) continue;

      await sequelize.query(
        "UPDATE cohort_programs SET description = :description WHERE id = :id",
        { replacements: { description: cleaned, id: row.id } },
      );
    }
  },

  // The markers were display noise duplicating data the trackers still hold on
  // the Programs row, so there is nothing meaningful to restore.
  async down() {},
};
