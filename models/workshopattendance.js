"use strict";
const { Model } = require("sequelize");

// One enterprise's attendance at one workshop. Recorded by hand today; the
// join/leave times are here so a meeting provider can fill them in later
// without changing the shape of the record.
module.exports = (sequelize, DataTypes) => {
  class WorkshopAttendance extends Model {
    static associate(models) {
      WorkshopAttendance.belongsTo(models.Workshop, {
        foreignKey: "workshopId",
        targetKey: "id",
      });
      WorkshopAttendance.belongsTo(models.Business, {
        foreignKey: "businessId",
        targetKey: "id",
      });
    }
  }

  WorkshopAttendance.STATUSES = [
    "present",
    "partial",
    "absent",
    "excused",
    "late",
  ];

  WorkshopAttendance.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      workshopId: { type: DataTypes.INTEGER, allowNull: false },
      businessId: { type: DataTypes.INTEGER, allowNull: true },
      userId: { type: DataTypes.INTEGER, allowNull: true },
      joinedAt: { type: DataTypes.DATE, allowNull: true },
      leftAt: { type: DataTypes.DATE, allowNull: true },
      minutes: { type: DataTypes.INTEGER, allowNull: true },
      status: {
        type: DataTypes.ENUM("present", "partial", "absent", "excused", "late"),
        allowNull: false,
        defaultValue: "absent",
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      recordedById: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      sequelize,
      modelName: "WorkshopAttendance",
      tableName: "workshop_attendance",
    },
  );

  return WorkshopAttendance;
};
