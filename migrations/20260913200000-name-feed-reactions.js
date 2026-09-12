"use strict";

// Reactions grow past a thumb up and a thumb down.
//
// The old column held 1 or -1, which can only ever say those two things. A
// name can say the rest — love, celebrate, insightful — without another
// migration every time one is added, and it reads as itself in the database.
//
// The rule is unchanged: one reaction per person per post, enforced by the
// unique index already on the table. Changing your mind rewrites the row.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("feed_reactions", "kind", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Carry across what is already there before the column is required.
    await queryInterface.sequelize.query(
      `UPDATE feed_reactions
          SET kind = CASE WHEN value > 0 THEN 'like' ELSE 'dislike' END`,
    );

    await queryInterface.changeColumn("feed_reactions", "kind", {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.removeColumn("feed_reactions", "value");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("feed_reactions", "value", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // Everything that is not a dislike collapses back to a like: the older
    // shape cannot hold the difference.
    await queryInterface.sequelize.query(
      `UPDATE feed_reactions
          SET value = CASE WHEN kind = 'dislike' THEN -1 ELSE 1 END`,
    );

    await queryInterface.changeColumn("feed_reactions", "value", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    await queryInterface.removeColumn("feed_reactions", "kind");
  },
};
