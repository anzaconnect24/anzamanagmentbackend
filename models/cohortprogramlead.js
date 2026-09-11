"use strict";
const { Model } = require("sequelize");

// Which staff run which programme. A programme can have several leads and a
// person can lead several programmes; the unique index on
// (cohortProgramId, userId) keeps the same person from being added twice.
//
// Leads are who gets told when something happens on their cohort — a coaching
// session logged against one of its startups, for a start.
module.exports = (sequelize, DataTypes) => {
  class CohortProgramLead extends Model {
    static associate(models) {
      CohortProgramLead.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
      });
      CohortProgramLead.belongsTo(models.User, {
        foreignKey: "userId",
      });
    }
  }

  CohortProgramLead.init(
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
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "CohortProgramLead",
      tableName: "cohort_program_leads",
      indexes: [
        {
          name: "cohort_program_leads_unique",
          unique: true,
          fields: ["cohortProgramId", "userId"],
        },
      ],
    },
  );

  return CohortProgramLead;
};
