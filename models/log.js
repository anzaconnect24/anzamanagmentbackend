"use strict";
const { Model } = require("sequelize");

// The platform activity log, and the capital facilitation audit trail.
//
// Rows written by the capital module (module = "capital") are the audit
// trail: who, in what role, did what to which opportunity, enterprise and
// provider, with the value before and after and the request's IP and device.
// They are immutable - the hooks below refuse to update or delete them, so no
// code path, however it reaches the model, can rewrite the record.
module.exports = (sequelize, DataTypes) => {
  class Log extends Model {
    static associate(models) {
      Log.belongsTo(models.User);
    }
  }

  const refuseCapital = (instance) => {
    if (instance && instance.module === "capital") {
      throw new Error("Capital facilitation audit records cannot be changed");
    }
  };

  Log.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // These columns were already in the table; the model now says so.
      actionType: {
        type: DataTypes.ENUM(
          "login",
          "crat_update",
          "module_start",
          "resource_access",
          "other",
          "capital",
        ),
        allowNull: false,
        defaultValue: "other",
      },
      resourceType: DataTypes.STRING,
      resourceId: DataTypes.INTEGER,
      resourceUuid: DataTypes.UUID,
      metadata: DataTypes.TEXT("long"),
      ipAddress: DataTypes.STRING,
      userAgent: DataTypes.TEXT,
      module: DataTypes.STRING(40),
      role: DataTypes.STRING(40),
      capitalOpportunityId: DataTypes.INTEGER,
      businessId: DataTypes.INTEGER,
      capitalProviderId: DataTypes.INTEGER,
      oldValue: DataTypes.TEXT("long"),
      newValue: DataTypes.TEXT("long"),
    },
    {
      sequelize,
      modelName: "Log",
      hooks: {
        beforeUpdate: refuseCapital,
        beforeDestroy: refuseCapital,
        // Bulk operations skip per-row hooks unless told otherwise, which
        // would be a way round the rule above.
        beforeBulkUpdate: (options) => {
          options.individualHooks = true;
        },
        beforeBulkDestroy: (options) => {
          options.individualHooks = true;
        },
      },
    },
  );

  return Log;
};
