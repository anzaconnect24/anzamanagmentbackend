"use strict";

// A startup can be on more than one programme at a time.
//
// cohort_memberships.businessId was UNIQUE, so a startup belonged to exactly
// one cohort and joining another had to replace the first row. That lost the
// history — a venture that went through Ideation and then an Accelerator could
// only ever show the second — and it made the roster screens fight each other,
// because assigning a startup to one programme silently removed it from
// another.
//
// The uniqueness moves to the pair instead: a startup can hold any number of
// memberships, but only one per programme, so enrolling twice into the same
// cohort is still rejected by the database rather than left to the callers.
const UNIQUE_BUSINESS_INDEX = "businessId";
const UNIQUE_PAIR_INDEX = "cohort_memberships_program_business";

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    // Enrolling the same startup twice into one programme would break the new
    // index, so fold any such rows down to the earliest first. There are none
    // today — businessId was unique — but a re-run after a partial migration
    // must not fail here.
    await sequelize.query(`
      DELETE m FROM cohort_memberships m
      JOIN cohort_memberships keep
        ON keep.cohortProgramId = m.cohortProgramId
       AND keep.businessId = m.businessId
       AND keep.id < m.id
    `);

    const indexes = await queryInterface.showIndex("cohort_memberships");
    const named = (name) => indexes.some((index) => index.name === name);

    // Order matters. businessId carries a foreign key to Businesses, and
    // MySQL refuses to drop the only index covering it ("needed in a foreign
    // key constraint"), so a replacement has to exist first. The new unique
    // pair index cannot serve that purpose either — businessId is its second
    // column, and a foreign key needs its column at the front — so this needs
    // an index of its own.
    //
    // It also earns its keep: "which programmes is this startup on?" now runs
    // on every learner-facing request.
    if (!named("cohort_memberships_business_idx")) {
      await queryInterface.addIndex("cohort_memberships", ["businessId"], {
        name: "cohort_memberships_business_idx",
      });
    }

    if (named(UNIQUE_BUSINESS_INDEX)) {
      await queryInterface.removeIndex(
        "cohort_memberships",
        UNIQUE_BUSINESS_INDEX,
      );
    }

    if (!named(UNIQUE_PAIR_INDEX)) {
      await queryInterface.addIndex(
        "cohort_memberships",
        ["cohortProgramId", "businessId"],
        { name: UNIQUE_PAIR_INDEX, unique: true },
      );
    }
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    // Going back means one programme per startup again, so all but the
    // earliest membership has to go or the unique index cannot be rebuilt.
    // The dropped rows are not recoverable, which is why this is a one-way
    // door in practice.
    await sequelize.query(`
      DELETE m FROM cohort_memberships m
      JOIN cohort_memberships keep
        ON keep.businessId = m.businessId
       AND keep.id < m.id
    `);

    const indexes = await queryInterface.showIndex("cohort_memberships");
    const named = (name) => indexes.some((index) => index.name === name);

    // Same ordering constraint as up(), mirrored: the replacement index has to
    // be in place before the one currently covering the foreign key goes.
    if (!named(UNIQUE_BUSINESS_INDEX)) {
      await queryInterface.addIndex("cohort_memberships", ["businessId"], {
        name: UNIQUE_BUSINESS_INDEX,
        unique: true,
      });
    }

    if (named("cohort_memberships_business_idx")) {
      await queryInterface.removeIndex(
        "cohort_memberships",
        "cohort_memberships_business_idx",
      );
    }

    if (named(UNIQUE_PAIR_INDEX)) {
      await queryInterface.removeIndex("cohort_memberships", UNIQUE_PAIR_INDEX);
    }
  },
};
