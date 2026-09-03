const { errorResponse, successResponse } = require("../../utils/responses");
const {
  Program,
  MentorEntreprenuer,
  TrackerEnterprise,
  Milestone,
  WeeklyLog,
  TrackerSession,
  User,
  Business,
  CohortProgram,
  CohortMembership,
  ClassProgramAccess,
  CourseCompletion,
} = require("../../models");
const { Op } = require("sequelize");
const { classify } = require("./program.authorization");

// Replace the set of cohorts allowed to open a class. An empty list clears the
// restriction, leaving the class open to everyone.
const setClassAccess = async (courseId, cohortProgramUuids) => {
  if (!Array.isArray(cohortProgramUuids)) return;

  const wanted = cohortProgramUuids.filter(Boolean);

  const cohorts = wanted.length
    ? await CohortProgram.findAll({
        where: { uuid: { [Op.in]: wanted } },
        attributes: ["id"],
      })
    : [];

  await ClassProgramAccess.destroy({ where: { courseId } });

  if (cohorts.length) {
    await ClassProgramAccess.bulkCreate(
      cohorts.map((cohort) => ({ courseId, cohortProgramId: cohort.id })),
    );
  }
};

// The cohort the signed-in user's startup belongs to, or null.
const myCohortProgramId = async (userId) => {
  const business = await Business.findOne({
    where: { userId },
    attributes: ["id"],
  });

  if (!business) return null;

  const membership = await CohortMembership.findOne({
    where: { businessId: business.id },
    attributes: ["cohortProgramId"],
  });

  return membership ? membership.cohortProgramId : null;
};

const accessInclude = {
  model: ClassProgramAccess,
  required: false,
  // cohortProgramId is needed for the membership comparison below.
  attributes: ["uuid", "cohortProgramId"],
  include: [{ model: CohortProgram, attributes: ["uuid", "title"] }],
};

const createProgram = async (req, res) => {
  try {
    let {
      title,
      description,
      image,
      programCategory,
      startDate,
      endDate,
      // Was previously dropped here, so every program was stored as a course.
      type,
      // Programme cohorts allowed to open this class. Empty/omitted = open.
      cohortProgramUuids,
    } = req.body;

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
      // "program" is a learn-and-grow course; the column is NOT NULL.
      type: type || "program",
    });

    await setClassAccess(response.id, cohortProgramUuids);

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

    const payload = { ...req.body };
    // Not a column — handled separately below.
    delete payload.cohortProgramUuids;

    const response = await program.update(payload);

    if (req.body.cohortProgramUuids !== undefined) {
      await setClassAccess(program.id, req.body.cohortProgramUuids);
    }

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
    let entrepreneurIds = [];
    if (startupUuids.length > 0) {
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
      entrepreneurIds = entrepreneurs.map((e) => e.id);
    }

    // Only the trackers keep cascading data. A cohort program (the ones
    // startups enrol in) and a learn-and-grow course own no tracker rows, so
    // deleting one must not touch milestones, sessions or BDA assignments —
    // its startups are simply released by the cohort membership cascade.
    const kind = classify(program);
    const ownsTrackerData = kind === "grant" || kind === "mentorship";

    // Entrepreneurs enrolled in THIS program. Previously this query had no
    // where clause, so it collected every entrepreneur with tracker data on
    // the platform and deleted all of it whenever any program was removed.
    const trackerEnterprises = ownsTrackerData
      ? await TrackerEnterprise.findAll({
          attributes: ["entreprenuerId"],
          where: { programId: program.id },
          raw: true,
          group: ["entreprenuerId"],
        })
      : [];

    const trackerEntrepreneurIds = trackerEnterprises.map(
      (te) => te.entreprenuerId,
    );

    // Combine both sets of entrepreneurs
    const allEntrepreneurIds = ownsTrackerData
      ? [...new Set([...entrepreneurIds, ...trackerEntrepreneurIds])]
      : [];

    console.log(
      `Deleting ${kind} program ${uuid} with ${allEntrepreneurIds.length} entrepreneurs`,
    );

    // Cascade delete this program's tracker data
    if (allEntrepreneurIds.length > 0) {
      // Delete TrackerSessions (coaching sessions)
      await TrackerSession.destroy({
        where: { entreprenuerId: { [Op.in]: allEntrepreneurIds } },
      });

      // Delete Milestones
      await Milestone.destroy({
        where: { entreprenuerId: { [Op.in]: allEntrepreneurIds } },
      });

      // Delete WeeklyLogs
      await WeeklyLog.destroy({
        where: { entreprenuerId: { [Op.in]: allEntrepreneurIds } },
      });

      // Delete TrackerEnterprises — scoped to this program, which is the one
      // table that records which program an enterprise belongs to.
      await TrackerEnterprise.destroy({
        where: { programId: program.id },
      });

      // Delete MentorEntreprenuers (BDA assignments)
      await MentorEntreprenuer.destroy({
        where: { entreprenuerId: { [Op.in]: allEntrepreneurIds } },
      });
    }

    // Delete the program itself
    await program.destroy();

    successResponse(res, {
      message: "Program and all associated data deleted successfully",
      kind,
      deletedEntrepreneurs: allEntrepreneurIds.length,
    });
  } catch (error) {
    console.error("Error deleting program:", error);
    errorResponse(res, error);
  }
};

const getAllPrograms = async (req, res) => {
  try {
    const { programCategory, type } = req.query;
    const whereClause = {};

    if (programCategory) {
      whereClause.programCategory = programCategory;
    }

    // e.g. ?type=grant to list only Grant Management programs.
    if (type) {
      whereClause.type = type;
    }

    const { count, rows } = await Program.findAndCountAll({
      where: whereClause,
      offset: req.offset,
      limit: req.limit,
      order: [["createdAt", "DESC"]],
      include: [accessInclude],
      // findAndCountAll with a hasMany include would otherwise count join rows.
      distinct: true,
    });

    let data = rows;

    // A startup only sees classes its programme cohort has been given access
    // to, plus classes nobody restricted. Enforced here rather than in the
    // client so it cannot be bypassed by calling the endpoint directly.
    if (req.user && req.user.role === "Enterprenuer") {
      const cohortProgramId = await myCohortProgramId(req.user.id);

      data = rows.filter((program) => {
        const grants = program.ClassProgramAccesses || [];
        if (grants.length === 0) return true;
        if (!cohortProgramId) return false;
        return grants.some(
          (grant) => grant.cohortProgramId === cohortProgramId,
        );
      });
    }

    successResponse(res, { count, data, page: req.page });
  } catch (error) {
    errorResponse(res, error);
  }
};
// The signed-in user's startup, or null.
const myBusiness = (userId) =>
  Business.findOne({ where: { userId }, attributes: ["id"] });

const findCourse = (uuid) =>
  Program.findOne({ where: { uuid }, attributes: ["id"] });

// Whether the signed-in startup has finished this class.
const getCourseCompletion = async (req, res) => {
  try {
    const course = await findCourse(req.params.uuid);
    if (!course) {
      return res.status(404).json({ status: false, message: "Class not found" });
    }

    const business = await myBusiness(req.user.id);

    const completion = business
      ? await CourseCompletion.findOne({
          where: { businessId: business.id, courseId: course.id },
        })
      : null;

    successResponse(res, {
      completed: !!completion,
      completedAt: completion ? completion.completedAt : null,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Mark it finished. Idempotent — finishing twice is still finished once.
const completeCourse = async (req, res) => {
  try {
    const course = await findCourse(req.params.uuid);
    if (!course) {
      return res.status(404).json({ status: false, message: "Class not found" });
    }

    const business = await myBusiness(req.user.id);
    if (!business) {
      return res.status(400).json({
        status: false,
        message: "Only a startup with a business profile can complete a class",
      });
    }

    const [completion] = await CourseCompletion.findOrCreate({
      where: { businessId: business.id, courseId: course.id },
      defaults: { completedAt: new Date() },
    });

    successResponse(res, {
      completed: true,
      completedAt: completion.completedAt,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const uncompleteCourse = async (req, res) => {
  try {
    const course = await findCourse(req.params.uuid);
    if (!course) {
      return res.status(404).json({ status: false, message: "Class not found" });
    }

    const business = await myBusiness(req.user.id);
    if (business) {
      await CourseCompletion.destroy({
        where: { businessId: business.id, courseId: course.id },
      });
    }

    successResponse(res, { completed: false });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getProgramDetails = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const response = await Program.findOne({
      where: { uuid },
      include: [accessInclude],
    });

    if (!response) {
      return res.status(404).json({
        status: false,
        message: "Program not found",
      });
    }

    // Opening a class by uuid must respect the same restriction as the list.
    const grants = response.ClassProgramAccesses || [];
    if (req.user && req.user.role === "Enterprenuer" && grants.length > 0) {
      const cohortProgramId = await myCohortProgramId(req.user.id);
      const allowed = grants.some(
        (grant) => grant.cohortProgramId === cohortProgramId,
      );

      if (!allowed) {
        return res.status(403).json({
          status: false,
          message: "This class is only open to specific programs",
        });
      }
    }

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
  getCourseCompletion,
  completeCourse,
  uncompleteCourse,
};
