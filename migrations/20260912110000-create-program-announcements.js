"use strict";

// What the programme lead has sent to its cohort, and what the system has
// raised internally.
//
// Notification rows are the delivery - one per recipient, which is what the
// bell reads. This is the record of the send itself: who sent it, to whom,
// what kind it was and how many it reached. Without it a lead cannot answer
// "did we remind them?" without counting notification rows.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("program_announcements", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      uuid: {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
      },
      cohortProgramId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "cohort_programs", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      // announcement, workshop_reminder, milestone_reminder, survey_request,
      // reporting_request - what kind of message this was, so the log reads
      // as a history rather than a pile of text.
      messageType: { type: Sequelize.STRING, allowNull: false },

      // cohort, selected, behind - who it went to.
      audience: { type: Sequelize.STRING, allowNull: false },

      subject: { type: Sequelize.STRING, allowNull: false },
      body: { type: Sequelize.TEXT, allowNull: false },

      // Counted at send time: recipients can leave the programme afterwards,
      // and the record should say who it actually reached.
      recipientCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },

      sentById: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface
      .addIndex("program_announcements", ["cohortProgramId", "createdAt"], {
        name: "program_announcements_programme_sent",
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.dropTable("program_announcements");
  },
};
