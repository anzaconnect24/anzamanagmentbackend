"use strict";
const { Model } = require("sequelize");

// The M&E audit trail. Every write records what changed, from what, by whom.
// Nothing here is ever updated or deleted.
module.exports = (sequelize, DataTypes) => {
  class MeAuditLog extends Model {
    static associate(models) {
      MeAuditLog.belongsTo(models.User, {
        foreignKey: "actorId",
        targetKey: "id",
        as: "actor",
      });
    }
  }

  MeAuditLog.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: { type: DataTypes.INTEGER, allowNull: true },
      entityType: { type: DataTypes.STRING, allowNull: false },
      entityId: { type: DataTypes.INTEGER, allowNull: true },
      entityUuid: { type: DataTypes.STRING, allowNull: true },
      action: { type: DataTypes.STRING, allowNull: false },
      changes: {
        type: DataTypes.JSON,
        allowNull: true,
        get() {
          const raw = this.getDataValue("changes");
          if (raw && typeof raw === "object") return raw;
          if (typeof raw !== "string") return null;
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        },
      },
      comments: { type: DataTypes.TEXT, allowNull: true },
      actorId: { type: DataTypes.INTEGER, allowNull: true },
      actorRole: { type: DataTypes.STRING, allowNull: true },
    },
    { sequelize, modelName: "MeAuditLog", tableName: "me_audit_logs" },
  );

  return MeAuditLog;
};
