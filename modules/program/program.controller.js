const { errorResponse, successResponse } = require("../../utils/responses");
const {
  Program,
  MentorEntreprenuer,
  TrackerEnterprise,
  Milestone,
  WeeklyLog,
  TrackerSession,
  User,
} = require("../../models");
const { Op } = require("sequelize");

const createProgram = async (req, res) => {
  try {
    let { title, description, image, programCategory, startDate, endDate } =
      req.body;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        status: false,
        message: "Program start date cannot be after end date",
      });
    }

    var response = await Program.create({
      title: title,
      description: description,
      image: image,
      programCategory: programCategory,
      startDate: startDate || null,
      endDate: endDate || null,
    });

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateProgram = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const { startDate, endDate } = req.body;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        status: false,
        message: "Program start date cannot be after end date",
      });
    }

    const program = await Program.findOne({
      where: {
        uuid,
      },
    });

    const response = await program.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteProgram = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const program = await Program.findOne({
      where: { uuid },
    });

    if (!program) {
      return res.status(404).json({
        status: false,
        message: "Program not found",
      });
    }

    // Parse the program description to extract enrolled startups (entrepreneurs)
    const TRACKER_STARTUPS_MARKER = "__TRACKER_STARTUPS__:";
    const rawDescription = String(program.description || "");
    const markerIdx = rawDescription.lastIndexOf(TRACKER_STARTUPS_MARKER);
    let startupUuids = [];

    if (markerIdx >= 0) {
      const line = rawDescription
        .slice(markerIdx + TRACKER_STARTUPS_MARKER.length)
        .split("\n")[0]
        .trim();
      try {
        startupUuids = JSON.parse(line);
        if (!Array.isArray(startupUuids)) {
          startupUuids = [];
        }
      } catch {
        startupUuids = [];
      }
    }

    // Convert entrepreneur UUIDs to IDs for database queries
    const entrepreneurs = await User.findAll({
      where: {
        uuid: {
          [Op.in]: startupUuids.filter(
            (uuid) => uuid && typeof uuid === "string",
          ),
        },
      },
      attributes: ["id"],
    });

    const entrepreneurIds = entrepreneurs.map((e) => e.id);

    // Cascade delete all tracker data for entrepreneurs in this program
    if (entrepreneurIds.length > 0) {
      // Delete TrackerSessions (coaching sessions)
      await TrackerSession.destroy({
        where: { entreprenuerId: { [Op.in]: entrepreneurIds } },
      });

      // Delete Milestones
      await Milestone.destroy({
        where: { entreprenuerId: { [Op.in]: entrepreneurIds } },
      });

      // Delete WeeklyLogs
      await WeeklyLog.destroy({
        where: { entreprenuerId: { [Op.in]: entrepreneurIds } },
      });

      // Delete TrackerEnterprises
      await TrackerEnterprise.destroy({
        where: { entreprenuerId: { [Op.in]: entrepreneurIds } },
      });

      // Delete MentorEntreprenuers (BDA assignments)
      await MentorEntreprenuer.destroy({
        where: { entreprenuerId: { [Op.in]: entrepreneurIds } },
      });
    }

    // Delete the program itself
    await program.destroy();

    successResponse(res, {
      message: "Program and all associated data deleted successfully",
      deletedEntrepreneurs: entrepreneurIds.length,
    });
  } catch (error) {
    console.error("Error deleting program:", error);
    errorResponse(res, error);
  }
};

const getAllPrograms = async (req, res) => {
  try {
    const { programCategory } = req.query;
    const whereClause = {};

    if (programCategory) {
      whereClause.programCategory = programCategory;
    }

    const { count, rows } = await Program.findAndCountAll({
      where: whereClause,
      offset: req.offset,
      limit: req.limit,
      order: [["createdAt", "DESC"]],
    });
    successResponse(res, { count, data: rows, page: req.page });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getProgramDetails = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const response = await Program.findOne({
      where: { uuid },
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createProgram,
  updateProgram,
  deleteProgram,
  getAllPrograms,
  getProgramDetails,
};
