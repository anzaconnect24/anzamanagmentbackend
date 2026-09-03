"use strict";

// Gives the "Startups by program" feature its own tables.
//
// It previously borrowed the shared `Programs` table — which also holds
// learn-and-grow courses, Grant Management programs and the BDA's mentorship
// programs — and hung a `programId` column off `Businesses`. That coupling is
// what made cohorts leak into Class Rooms, tangled the authorisation rules
// with Grant Management, and put cohort deletes in reach of the tracker's
// cascade logic.
//
// After this migration the feature owns:
//   cohort_programs     - the programmes a startup enrols in
//   cohort_memberships  - which startup is in which programme (one at a time)
//
// The existing cohort rows and assignments are carried across, then removed
// from `Programs` so there is a single source of truth. `uuid` is preserved,
// so any link or bookmark to a cohort keeps working.
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await queryInterface.createTable("cohort_programs", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true,
      },
      title: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      image: { type: Sequelize.STRING, allowNull: true },
      category: { type: Sequelize.STRING, allowNull: true },
      startDate: { type: Sequelize.DATEONLY, allowNull: true },
      endDate: { type: Sequelize.DATEONLY, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("cohort_memberships", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "cohort_programs", key: "id" },
        onUpdate: "CASCADE",
        // Deleting a programme releases its startups; the startups themselves
        // are never touched.
        onDelete: "CASCADE",
      },
      businessId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // A startup belongs to one cohort at a time.
        unique: true,
        references: { model: "Businesses", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("cohort_memberships", ["cohortProgramId"], {
      name: "cohort_memberships_program_idx",
    });

    // 1. Carry the cohort programmes across, keeping their uuid and id so the
    //    membership copy below can map straight from Businesses.programId.
    await sequelize.query(`
      INSERT INTO cohort_programs
        (id, uuid, title, description, image, category, startDate, endDate, createdAt, updatedAt)
      SELECT id, uuid, title, description, image, programCategory, startDate, endDate, createdAt, updatedAt
      FROM Programs
      WHERE type = 'cohort'
    `);

    // 2. Carry the current assignments across.
    await sequelize.query(`
      INSERT INTO cohort_memberships (uuid, cohortProgramId, businessId, createdAt, updatedAt)
      SELECT UUID(), b.programId, b.id, NOW(), NOW()
      FROM Businesses b
      JOIN cohort_programs cp ON cp.id = b.programId
      WHERE b.programId IS NOT NULL
    `);

    // 3. Drop the coupling to the shared table. MySQL refuses to drop the
    //    index while the foreign key still needs it, so the constraint goes
    //    first; dropping the column then takes the index with it.
    const [fks] = await sequelize.query(`
      SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Businesses'
        AND COLUMN_NAME = 'programId'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    for (const { CONSTRAINT_NAME } of fks) {
      await queryInterface.removeConstraint("Businesses", CONSTRAINT_NAME);
    }

    await queryInterface.removeColumn("Businesses", "programId");

    await sequelize.query(`DELETE FROM Programs WHERE type = 'cohort'`);
  },

  async down(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    // Put the cohorts back on the shared table...
    await sequelize.query(`
      INSERT INTO Programs
        (id, uuid, title, description, image, programCategory, startDate, endDate, type, createdAt, updatedAt)
      SELECT id, uuid, title, description,
             COALESCE(image, '/images/ideation-classes.svg'),
             COALESCE(category, 'Accelerator'),
             startDate, endDate, 'cohort', createdAt, updatedAt
      FROM cohort_programs
    `);

    await queryInterface.addColumn("Businesses", "programId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: { model: "Programs", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("Businesses", ["programId"], {
      name: "businesses_program_id_idx",
    });

    await sequelize.query(`
      UPDATE Businesses b
      JOIN cohort_memberships m ON m.businessId = b.id
      SET b.programId = m.cohortProgramId
    `);

    await queryInterface.dropTable("cohort_memberships");
    await queryInterface.dropTable("cohort_programs");
  },
};
