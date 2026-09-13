"use strict";
const { Model } = require("sequelize");

// A permission. `key` is what code checks ("capital.requests.review"); `name`
// and `description` are what an administrator reads when granting it.
// Roles hold permissions through RolePermission, and a single user can be
// granted one directly through UserPermission.
module.exports = (sequelize, DataTypes) => {
  class Permission extends Model {
    static associate(models) {
      Permission.hasMany(models.UserPermission, { onDelete: "cascade" });
      Permission.hasMany(models.RolePermission, {
        foreignKey: "permissionId",
        onDelete: "cascade",
      });
    }
  }

  Permission.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      key: {
        type: DataTypes.STRING(80),
        allowNull: true,
        unique: true,
      },
      module: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Permission",
    },
  );

  return Permission;
};
