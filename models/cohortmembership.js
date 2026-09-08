"use strict";
const { Model } = require("sequelize");

// Whether the startup is up to date with its reporting on this programme.
const REPORTING_STATUSES = ["up_to_date", "pending", "overdue"];

// Where a startup stands within its programme: on it, or dropped out.
const MEMBERSHIP_STATUSES = ["active", "dropped_out"];

// Which startup is in which programme. A startup can hold any number of
// memberships — a venture may be on an Ideation cohort and an Accelerator at
// once, and past programmes stay on its record — but only one per programme,
// which the unique index on (cohortProgramId, businessId) enforces.
module.exports = (sequelize, DataTypes) => {
  class CohortMembership extends Model {
    static associate(models) {
      CohortMembership.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
      });
      CohortMembership.belongsTo(models.Business, {
        foreignKey: "businessId",
      });
    }
  }

  CohortMembership.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      businessId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reportingStatus: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending",
        validate: {
          isIn: {
            args: [REPORTING_STATUSES],
            msg: `reportingStatus must be one of: ${REPORTING_STATUSES.join(", ")}`,
          },
        },
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "active",
        validate: {
          isIn: {
            args: [MEMBERSHIP_STATUSES],
            msg: `status must be one of: ${MEMBERSHIP_STATUSES.join(", ")}`,
          },
        },
      },
    },
    {
      sequelize,
      modelName: "CohortMembership",
      tableName: "cohort_memberships",
      indexes: [
        {
          name: "cohort_memberships_program_business",
          unique: true,
          fields: ["cohortProgramId", "businessId"],
        },
      ],
    },
  );

  CohortMembership.STATUSES = MEMBERSHIP_STATUSES;
  CohortMembership.REPORTING_STATUSES = REPORTING_STATUSES;

  return CohortMembership;
};
