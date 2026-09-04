const { errorResponse, successResponse } = require("../../utils/responses");
const {
  Module,
  User,
  Slide,
  SlideReader,
  Program,
  CohortProgram,
  CohortMembership,

  Business,
  Quiz,
  QuizQuestion,
} = require("../../models");
const { Op } = require("sequelize");
const { sendEmail } = require("../../utils/send_email");
const program = require("../../models/program");

const createModule = async (req, res) => {
  try {
    const { title, cohort_program_uuid, program_uuid, image, description } =
      req.body;

    // A module belongs to a programme. program_uuid is still accepted so the
    // handful of modules authored under a course keep working.
    const cohort = cohort_program_uuid
      ? await CohortProgram.findOne({ where: { uuid: cohort_program_uuid } })
      : null;

    if (cohort_program_uuid && !cohort) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const program = program_uuid
      ? await Program.findOne({ where: { uuid: program_uuid } })
      : null;

    if (!cohort && !program) {
      return res.status(400).json({
        status: false,
        message: "A module must be created against a program",
      });
    }

    const response = await Module.create({
      title,
      cohortProgramId: cohort ? cohort.id : null,
      programId: program ? program.id : null,
      image,
      description,
    });

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateModule = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const module = await Module.findOne({
      where: {
        uuid,
      },
    });
    const response = await module.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getModule = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    console.log(uuid);
    const module = await Module.findOne({
      where: {
        uuid,
      },
    });
    successResponse(res, module);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteModule = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const module = await Module.findOne({ where: { uuid } });

    if (!module) {
      return res
        .status(404)
        .json({ status: false, message: "Module not found" });
    }

    // The module's own content goes with it. Without this the slides, the
    // rows recording who read them and the quizzes were left behind pointing
    // at a module that no longer exists.
    const slides = await Slide.findAll({
      attributes: ["id"],
      where: { moduleId: module.id },
      raw: true,
    });

    if (slides.length) {
      const slideIds = slides.map((row) => row.id);
      await SlideReader.destroy({ where: { slideId: { [Op.in]: slideIds } } });
      await Slide.destroy({ where: { id: { [Op.in]: slideIds } } });
    }

    await Quiz.destroy({ where: { moduleId: module.id } });

    await module.destroy();

    successResponse(res, { deleted: true, slides: slides.length });
  } catch (error) {
    errorResponse(res, error);
  }
};

// The programme the signed-in startup is enrolled in, or null.
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

const getModules = async (req, res) => {
  try {
    // "undefined"/"null" arrive as text when a caller interpolates a missing
    // value into the query string.
    const clean = (value) =>
      value && value !== "undefined" && value !== "null" ? value : null;

    const program_uuid = clean(req.query.program_uuid);
    const cohort_program_uuid = clean(req.query.cohort_program_uuid);

    const where = {};

    if (cohort_program_uuid) {
      const cohort = await CohortProgram.findOne({
        where: { uuid: cohort_program_uuid },
        attributes: ["id"],
      });

      if (!cohort) {
        return successResponse(res, { count: 0, data: [], page: req.page });
      }

      where.cohortProgramId = cohort.id;
    } else if (program_uuid) {
      const program = await Program.findOne({
        where: { uuid: program_uuid },
        attributes: ["id"],
      });

      if (!program) {
        return successResponse(res, { count: 0, data: [], page: req.page });
      }

      where.programId = program.id;
    } else if (req.user && req.user.role === "Enterprenuer") {
      // No filter given: a startup sees the modules of its own programme.
      const cohortProgramId = await myCohortProgramId(req.user.id);

      if (!cohortProgramId) {
        return successResponse(res, { count: 0, data: [], page: req.page });
      }

      where.cohortProgramId = cohortProgramId;
    }

    const { count, rows } = await Module.findAndCountAll({
      offset: req.offset,
      limit: req.limit,
      order: [["createdAt", "ASC"]],
      distinct: true,
      include: [
        {
          model: Slide,
          required: false,
          include: [
            {
              model: SlideReader,
              where: {
                userId: req.user.id,
              },
              required: false,
            },
          ],
        },
      ],
      where,
    });
    successResponse(res, { count, data: rows, page: req.page });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Everything the staff view of a module shows, in one call: the module, the
// programme it belongs to, its slides, its quizzes, and how far each startup
// on the programme has read.
const getModuleOverview = async (req, res) => {
  try {
    const module = await Module.findOne({ where: { uuid: req.params.uuid } });

    if (!module) {
      return res
        .status(404)
        .json({ status: false, message: "Module not found" });
    }

    const program = module.cohortProgramId
      ? await CohortProgram.findByPk(module.cohortProgramId)
      : null;

    const slides = await Slide.findAll({
      where: { moduleId: module.id },
      attributes: ["id", "uuid", "title", "type", "createdAt"],
      order: [["createdAt", "ASC"]],
      raw: true,
    });

    const quizzes = await Quiz.findAll({
      where: { moduleId: module.id },
      attributes: ["uuid", "title", "isPublished", "passingScore"],
      include: [
        { model: QuizQuestion, as: "questions", attributes: ["uuid"] },
      ],
      order: [["createdAt", "ASC"]],
    });

    // The programme's roster, with how much of this module each has read.
    const memberships = program
      ? await CohortMembership.findAll({
          attributes: ["businessId", "status", "createdAt"],
          where: { cohortProgramId: program.id },
          raw: true,
        })
      : [];

    const businesses = memberships.length
      ? await Business.findAll({
          where: { id: { [Op.in]: memberships.map((row) => row.businessId) } },
          attributes: ["id", "uuid", "name", "email", "userId"],
          order: [["name", "ASC"]],
          raw: true,
        })
      : [];

    const slideIds = slides.map((row) => row.id);
    const userIds = businesses.map((row) => row.userId).filter(Boolean);

    const reads =
      slideIds.length && userIds.length
        ? await SlideReader.findAll({
            attributes: ["userId", "slideId"],
            where: {
              slideId: { [Op.in]: slideIds },
              userId: { [Op.in]: userIds },
            },
            raw: true,
          })
        : [];

    // A slide read twice is still one slide read.
    const seen = new Set();
    const readsBy = new Map();

    for (const read of reads) {
      const key = `${read.userId}:${read.slideId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      readsBy.set(read.userId, (readsBy.get(read.userId) || 0) + 1);
    }

    const membershipBy = new Map(
      memberships.map((row) => [row.businessId, row]),
    );

    successResponse(res, {
      module,
      program,
      slides: slides.map(({ id, ...rest }) => rest),
      quizzes: quizzes.map((quiz) => ({
        uuid: quiz.uuid,
        title: quiz.title,
        isPublished: quiz.isPublished,
        passingScore: quiz.passingScore,
        questions: quiz.questions ? quiz.questions.length : 0,
      })),
      members: businesses.map((business) => {
        const membership = membershipBy.get(business.id) || {};

        return {
          uuid: business.uuid,
          name: business.name,
          email: business.email,
          enrolledAt: membership.createdAt || null,
          membershipStatus: membership.status || null,
          slidesRead: readsBy.get(business.userId) || 0,
          slidesTotal: slides.length,
        };
      }),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createModule,
  getModuleOverview,
  updateModule,
  deleteModule,
  getModules,
  getModule,
};
