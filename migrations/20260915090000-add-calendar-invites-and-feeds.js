"use strict";

// Two additions to the calendar, both asked for by the same screen.
//
// 1. An invitation is now a question, not an announcement. A person named on
//    an event can say whether they are coming, so "Invites" can mean the ones
//    still waiting on them rather than every event they were ever named on.
//
// 2. A calendar can be read by the reader's own calendar app. That needs a URL
//    Google or Outlook can fetch without a session, so each account gets a
//    long random token standing in for it. The token is the credential: it is
//    kept in its own table so it can be rolled without touching the account,
//    and so a leaked feed URL is revoked by deleting one row.
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("calendar_event_users");

    // "pending" for the rows already there: nobody has been asked yet.
    if (!table.response) {
      await queryInterface.addColumn("calendar_event_users", "response", {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "pending",
      });
    }

    if (!table.respondedAt) {
      await queryInterface.addColumn("calendar_event_users", "respondedAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    // The Invites tab counts these, so it is read by user and answer together.
    await queryInterface
      .addIndex("calendar_event_users", ["userId", "response"], {
        name: "calendar_event_users_by_response",
      })
      .catch(() => {});

    await queryInterface.createTable("calendar_feed_tokens", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      // The secret in the URL. Unique so a lookup is one indexed read, and
      // long enough that guessing one is not a strategy.
      token: { type: Sequelize.STRING(64), allowNull: false, unique: true },

      // Only so a person can see whether the subscription is actually being
      // read, which is the first question when a calendar looks stale.
      lastUsedAt: { type: Sequelize.DATE, allowNull: true },

      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    // One live feed per account. Rolling it replaces the row.
    await queryInterface
      .addIndex("calendar_feed_tokens", ["userId"], {
        name: "calendar_feed_tokens_by_user",
        unique: true,
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.dropTable("calendar_feed_tokens");

    await queryInterface
      .removeIndex("calendar_event_users", "calendar_event_users_by_response")
      .catch(() => {});

    await queryInterface.removeColumn("calendar_event_users", "respondedAt");
    await queryInterface.removeColumn("calendar_event_users", "response");
  },
};
