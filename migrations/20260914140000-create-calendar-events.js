"use strict";

// The platform calendar.
//
// Two things live in the same table because they are the same thing seen from
// different sides: an event a programme publishes, and a reminder somebody
// keeps for themselves. What separates them is only who may see it.
//
// visibility says who the audience is:
//   private   - the person who wrote it, and nobody else. The default, and
//               the only kind most roles can create.
//   programs  - everyone on the named programmes: the startups on them and
//               the advisors leading them.
//   users     - the named people.
//   everyone  - every signed-in account.
//
// A private reminder is never visible to an administrator either. That is the
// point of it: staff keep their own notes in the same place they read the
// programme's schedule, and nothing leaks by being in one table.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("calendar_events", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      uuid: {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
      },

      createdById: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      title: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      location: { type: Sequelize.STRING, allowNull: true },

      // Held as a date and an optional time rather than one timestamp: most
      // entries here are "the 14th", and storing midnight for those invites a
      // timezone to move them a day.
      startDate: { type: Sequelize.DATEONLY, allowNull: false },
      endDate: { type: Sequelize.DATEONLY, allowNull: true },
      startTime: { type: Sequelize.STRING, allowNull: true },
      endTime: { type: Sequelize.STRING, allowNull: true },

      colour: { type: Sequelize.STRING, allowNull: false, defaultValue: "blue" },

      visibility: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "private",
      },

      archivedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.createTable("calendar_event_programs", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      eventId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "calendar_events", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      cohortProgramId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "cohort_programs", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.createTable("calendar_event_users", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      eventId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "calendar_events", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    // The calendar is read a month at a time, by whoever is looking.
    await queryInterface
      .addIndex("calendar_events", ["startDate", "archivedAt"], {
        name: "calendar_events_by_date",
      })
      .catch(() => {});

    await queryInterface
      .addIndex("calendar_events", ["createdById"], {
        name: "calendar_events_by_author",
      })
      .catch(() => {});

    await queryInterface
      .addIndex("calendar_event_programs", ["eventId", "cohortProgramId"], {
        name: "calendar_event_programs_unique",
        unique: true,
      })
      .catch(() => {});

    await queryInterface
      .addIndex("calendar_event_users", ["eventId", "userId"], {
        name: "calendar_event_users_unique",
        unique: true,
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.dropTable("calendar_event_users");
    await queryInterface.dropTable("calendar_event_programs");
    await queryInterface.dropTable("calendar_events");
  },
};
