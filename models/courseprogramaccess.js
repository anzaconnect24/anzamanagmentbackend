"use strict";
const { Model } = require("sequelize");

// Extra programmes a course is visible to.
//
// A course still belongs to one programme through Course.cohortProgramId -
// its home, which owns its position in that programme's list and is where it
// was created. These rows widen who can see it, so one course written once can
// be offered to several cohorts instead of being copied per programme.
//
// The home programme is not repeated here: a listing reads
// "home programme OR an access row", so keeping one source per relationship
// means the two can never disagree.
module.exports = (sequelize, DataTypes) => {
  class CourseProgramAccess extends Model {
    static associate(models) {
      CourseProgramAccess.belongsTo(models.Course, { foreignKey: "courseId" });
      CourseProgramAccess.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
      });
    }
  }

  CourseProgramAccess.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      courseId: { type: DataTypes.INTEGER, allowNull: false },
      cohortProgramId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      modelName: "CourseProgramAccess",
      tableName: "course_program_access",
      indexes: [
        {
          name: "course_program_access_unique",
          unique: true,
          fields: ["courseId", "cohortProgramId"],
        },
      ],
    },
  );

  return CourseProgramAccess;
};
