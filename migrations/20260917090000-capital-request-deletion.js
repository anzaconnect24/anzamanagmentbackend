"use strict";

// Capital requests can be deleted. Deletion is soft: the row stays, with who
// deleted it and why, so the audit trail and any documents keep their record,
// while every query stops returning it. Adds the capital.requests.delete
// permission, granted to the Capital Facilitation Manager.
const KEY = "capital.requests.delete";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("capital_requests");
    if (!table.deletedAt) await queryInterface.addColumn("capital_requests", "deletedAt", { type: Sequelize.DATE, allowNull: true });
    if (!table.deletedById) await queryInterface.addColumn("capital_requests", "deletedById", { type: Sequelize.INTEGER, allowNull: true });
    if (!table.deleteReason) await queryInterface.addColumn("capital_requests", "deleteReason", { type: Sequelize.TEXT, allowNull: true });

    const now = new Date();
    const v4 = () => require("crypto").randomUUID();

    await queryInterface.sequelize.query(
      "INSERT IGNORE INTO Permissions (uuid, name, description, `key`, module, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'capital', ?, ?)",
      { replacements: [v4(), KEY, "Delete capital requests that have no capital opportunities", KEY, now, now] },
    );
    const [[permission]] = await queryInterface.sequelize.query("SELECT id FROM Permissions WHERE `key` = ?", { replacements: [KEY] });
    await queryInterface.sequelize.query(
      "INSERT IGNORE INTO role_permissions (uuid, role, permissionId, createdAt, updatedAt) VALUES (?, 'CFM', ?, ?, ?)",
      { replacements: [v4(), permission.id, now, now] },
    );
  },

  async down(queryInterface) {
    const [[permission]] = await queryInterface.sequelize.query("SELECT id FROM Permissions WHERE `key` = ?", { replacements: [KEY] });
    if (permission) {
      await queryInterface.sequelize.query("DELETE FROM role_permissions WHERE permissionId = ?", { replacements: [permission.id] });
      await queryInterface.sequelize.query("DELETE FROM Permissions WHERE id = ?", { replacements: [permission.id] });
    }
    await queryInterface.removeColumn("capital_requests", "deleteReason");
    await queryInterface.removeColumn("capital_requests", "deletedById");
    await queryInterface.removeColumn("capital_requests", "deletedAt");
  },
};
