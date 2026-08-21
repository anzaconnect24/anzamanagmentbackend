"use strict";

const { errorResponse, successResponse } = require("../../utils/responses");
const { CourseRating, Program, User } = require("../../models");

const upsertRating = async (req, res) => {
  try {
    const userId = req.user.id;
    const { programUuid, rating } = req.body;

    if (!programUuid) {
      return res.status(400).json({
        status: false,
        message: "Program UUID is required",
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        status: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const program = await Program.findOne({
      where: { uuid: programUuid },
      attributes: ["id"],
    });

    if (!program) {
      return res.status(404).json({
        status: false,
        message: "Program not found",
      });
    }

    const [ratingRecord, created] = await CourseRating.findOrCreate({
      where: { userId, programId: program.id },
      defaults: { rating },
    });

    if (!created) {
      await ratingRecord.update({ rating });
    }

    successResponse(res, {
      uuid: ratingRecord.uuid,
      programUuid,
      rating: ratingRecord.rating,
      created,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getRatings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { programUuids } = req.query;

    const where = { userId };
    if (programUuids) {
      const uuids = Array.isArray(programUuids)
        ? programUuids
        : programUuids.split(",");
      
      const programs = await Program.findAll({
        where: { uuid: uuids },
        attributes: ["id", "uuid"],
      });

      const programIds = programs.map((p) => p.id);
      where.programId = programIds;
    }

    const ratings = await CourseRating.findAll({
      where,
      include: [
        {
          model: Program,
          as: "Program",
          attributes: ["id", "uuid", "title"],
        },
      ],
    });

    const ratingsMap = {};
    ratings.forEach((r) => {
      ratingsMap[r.Program?.uuid] = r.rating;
    });

    successResponse(res, ratingsMap);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getAverageRatings = async (req, res) => {
  try {
    const { programUuids } = req.query;

    if (!programUuids) {
      return successResponse(res, {});
    }

    const uuids = Array.isArray(programUuids)
      ? programUuids
      : programUuids.split(",");

    const programs = await Program.findAll({
      where: { uuid: uuids },
      attributes: ["id", "uuid"],
    });

    const programIds = programs.map((p) => p.id);

    const ratings = await CourseRating.findAll({
      where: { programId: programIds },
      attributes: [
        "programId",
        [require("sequelize").fn("AVG", require("sequelize").col("rating")), "avgRating"],
        [require("sequelize").fn("COUNT", require("sequelize").col("id")), "ratingCount"],
      ],
      group: ["programId"],
      raw: true,
    });

    const ratingsMap = {};
    const programIdToUuid = {};
    programs.forEach((p) => {
      programIdToUuid[p.id] = p.uuid;
    });

    ratings.forEach((r) => {
      const uuid = programIdToUuid[r.programId];
      if (uuid) {
        ratingsMap[uuid] = {
          average: Math.round(parseFloat(r.avgRating) * 10) / 10,
          count: parseInt(r.ratingCount),
        };
      }
    });

    successResponse(res, ratingsMap);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteRating = async (req, res) => {
  try {
    const userId = req.user.id;
    const { programUuid } = req.params;

    const program = await Program.findOne({
      where: { uuid: programUuid },
      attributes: ["id"],
    });

    if (!program) {
      return res.status(404).json({
        status: false,
        message: "Program not found",
      });
    }

    const deleted = await CourseRating.destroy({
      where: { userId, programId: program.id },
    });

    successResponse(res, { deleted: deleted > 0 });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  upsertRating,
  getRatings,
  getAverageRatings,
  deleteRating,
};
