"use strict";

// Links a startup (Business) to the Program cohort it belongs to. Admin/Staff
// assign the roster from the Programs area; nullable because a startup may not
// be in any program yet ("Unassigned" on the program grid).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Businesses", "programId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: { model: "Programs", key: "id" },
      onUpdate: "CASCADE",
      // Deleting a program un-assigns its startups rather than deleting them.
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("Businesses", ["programId"], {
      name: "businesses_program_id_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("Businesses", "businesses_program_id_idx");
    await queryInterface.removeColumn("Businesses", "programId");
  },
};
