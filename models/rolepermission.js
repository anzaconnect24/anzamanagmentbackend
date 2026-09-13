"use strict";
const { Model } = require("sequelize");

// A permission held by everyone with a role. Keyed by the role string, because
// that is what User.role stores. An administrator edits these rows to change
// what a role may do, with no code change.
module.exports = (sequelize, DataTypes) => {
  class RolePermission extends Model {
    static associate(models) {
      RolePermission.belongsTo(models.Permission, {
        foreignKey: "permissionId",
      });
    }
  }

  RolePermission.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING(40),
        allowNull: false,
      },
      permissionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "RolePermission",
      tableName: "role_permissions",
    },
  );

  return RolePermission;
};
