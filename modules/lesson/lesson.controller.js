const { errorResponse, successResponse } = require("../../utils/responses");
const {
  Slide,
  SlideReader,
  Module,
  Course,
  CohortProgram,
  CohortMembership,
  Business,
  sequelize,
} = require("../../models");
const { Op } = require("sequelize");

// Learning content is Course -> Module -> Slides. A module holds its slides
// directly; there is no lesson layer in between.
//
// The `lessons` table is left in place unused rather than dropped, so the
// modules authored while it existed keep their history. Slides have always
// carried moduleId, so nothing had to move.

const AUTHOR_ROLES = ["Admin", "Staff", "Reviewer"];
const isAuthor = (req) => AUTHOR_ROLES.includes(req.user && req.user.role);

// The programme the signed-in startup is enrolled in.
// The programme behind a learner's "mine" request.
//
// A startup can be on several programmes now, and this route resolves to a
// single one, so it takes the most recently joined — the one a learner is
// currently working through. Ordering explicitly matters: without it the row
// that came back was whichever the database happened to return first, which
// would flip between requests once a startup holds more than one membership.
//
// Showing a learner every programme they are on would need its own route
// rather than overloading "mine". There isn't one yet.
const myProgramme = async (userId) => {
  const business = await Business.findOne({
    where: { userId },
    attributes: ["id"],
  });

  if (!business) return null;

  const membership = await CohortMembership.findOne({
    where: { businessId: business.id },
    attributes: ["cohortProgramId"],
    order: [["createdAt", "DESC"], ["id", "DESC"]],
  });

  return membership
    ? CohortProgram.findByPk(membership.cohortProgramId)
    : null;
};

const contentOf = (slide) => ({
  uuid: slide.uuid,
  title: slide.title,
  type: slide.type,
  position: slide.position,
  content: slide.content,
  file: slide.file,
  url: slide.url,
  durationSeconds: slide.durationSeconds,
  thumbnail: slide.thumbnail,
  description: slide.description,
  downloadable: slide.downloadable,
});

// Whether one learner has finished one slide.
//
// A video has to have been watched, not merely opened — that is the whole
// point of tracking percentWatched. Everything else is done once it is read.
const isItemComplete = (slide, read) => {
  if (!read) return false;
  if (slide.type !== "video") return !!read.completed;
  if (read.completed) return true;

  const percent = Number(read.percentWatched);
  return Number.isFinite(percent) && percent >= Slide.VIDEO_COMPLETION_PERCENT;
};

const slidesOf = (moduleId) =>
  Slide.findAll({
    where: { moduleId },
    order: [
      ["position", "ASC"],
      ["createdAt", "ASC"],
    ],
  });

// ------------------------------------------------------------- read paths

// A whole course as a learner or a builder sees it: its modules, the slides
// inside each, and how far the caller has got.
//
// The uuid may name a course, a programme, or "mine" for the learner's own
// programme. A programme answers with the modules of all its courses, which is
// what the older callers expect.
const getCourseOutline = async (req, res) => {
  try {
    const { uuid } = req.params;

    let course = await Course.findOne({ where: { uuid } });
    let programme = null;

    if (course) {
      programme = await CohortProgram.findByPk(course.cohortProgramId);
    } else {
      programme =
        uuid === "mine"
          ? await myProgramme(req.user.id)
          : await CohortProgram.findOne({ where: { uuid } });
    }

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const modules = await Module.findAll({
      where: course
        ? { courseId: course.id }
        : { cohortProgramId: programme.id },
      order: [["createdAt", "ASC"]],
    });

    const moduleIds = modules.map((row) => row.id);

    const slides = moduleIds.length
      ? await Slide.findAll({
          where: { moduleId: { [Op.in]: moduleIds } },
          order: [
            ["position", "ASC"],
            ["createdAt", "ASC"],
          ],
        })
      : [];

    const reads = slides.length
      ? await SlideReader.findAll({
          where: {
            slideId: { [Op.in]: slides.map((row) => row.id) },
            userId: req.user.id,
          },
          raw: true,
        })
      : [];

    const readsBySlide = new Map(reads.map((row) => [row.slideId, row]));

    let total = 0;
    let done = 0;

    const shaped = modules.map((module) => {
      const items = slides.filter((slide) => slide.moduleId === module.id);

      const completed = items.filter((slide) =>
        isItemComplete(slide, readsBySlide.get(slide.id)),
      ).length;

      total += items.length;
      done += completed;

      return {
        uuid: module.uuid,
        title: module.title,
        description: module.description,
        image: module.image,
        content: items.map((slide) => ({
          ...contentOf(slide),
          complete: isItemComplete(slide, readsBySlide.get(slide.id)),
          lastPosition: readsBySlide.get(slide.id)?.lastPosition ?? null,
          percentWatched: readsBySlide.get(slide.id)?.percentWatched ?? null,
        })),
        progress: {
          total: items.length,
          completed,
          percent: items.length
            ? Math.round((completed / items.length) * 100)
            : 0,
          complete: items.length > 0 && completed === items.length,
        },
      };
    });

    successResponse(res, {
      program: programme,
      course: course
        ? {
            uuid: course.uuid,
            title: course.title,
            description: course.description,
            image: course.image,
            estimatedHours: course.estimatedHours,
          }
        : null,
      modules: shaped,
      progress: {
        totalItems: total,
        completedItems: done,
        percent: total ? Math.round((done / total) * 100) : 0,
      },
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// The slides of one module, for the builder and the player sidebar.
const getModuleContent = async (req, res) => {
  try {
    const module = await Module.findOne({
      where: { uuid: req.params.moduleUuid },
    });

    if (!module) {
      return res
        .status(404)
        .json({ status: false, message: "Module not found" });
    }

    const slides = await slidesOf(module.id);

    const reads = slides.length
      ? await SlideReader.findAll({
          where: {
            slideId: { [Op.in]: slides.map((row) => row.id) },
            userId: req.user.id,
          },
          raw: true,
        })
      : [];

    const readsBySlide = new Map(reads.map((row) => [row.slideId, row]));

    const completed = slides.filter((slide) =>
      isItemComplete(slide, readsBySlide.get(slide.id)),
    ).length;

    successResponse(res, {
      module: {
        uuid: module.uuid,
        title: module.title,
        description: module.description,
        image: module.image,
      },
      data: slides.map((slide) => ({
        ...contentOf(slide),
        complete: isItemComplete(slide, readsBySlide.get(slide.id)),
        lastPosition: readsBySlide.get(slide.id)?.lastPosition ?? null,
        percentWatched: readsBySlide.get(slide.id)?.percentWatched ?? null,
      })),
      count: slides.length,
      progress: {
        total: slides.length,
        completed,
        percent: slides.length
          ? Math.round((completed / slides.length) * 100)
          : 0,
      },
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ------------------------------------------------------------ write paths

// Reorder the slides inside a module, from the order they arrive in.
const reorderContent = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const module = await Module.findOne({
      where: { uuid: req.params.moduleUuid },
    });

    if (!module) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Module not found" });
    }

    const order = Array.isArray(req.body.contentUuids)
      ? req.body.contentUuids
      : [];

    for (const [index, uuid] of order.entries()) {
      await Slide.update(
        { position: index },
        { where: { uuid, moduleId: module.id }, transaction },
      );
    }

    await transaction.commit();

    successResponse(res, { reordered: order.length });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

// ---------------------------------------------------------------- progress

// A learner reporting how far through a slide they got.
//
// Videos send how much they watched; everything else just says it was opened.
// Progress only ever moves forward, so scrubbing backwards in a video does not
// undo what was already watched.
const recordProgress = async (req, res) => {
  try {
    const slide = await Slide.findOne({
      where: { uuid: req.params.contentUuid },
    });

    if (!slide) {
      return res
        .status(404)
        .json({ status: false, message: "Content not found" });
    }

    const [read] = await SlideReader.findOrCreate({
      where: { slideId: slide.id, userId: req.user.id },
      defaults: {
        slideId: slide.id,
        userId: req.user.id,
        completed: false,
      },
    });

    const payload = {};

    if (slide.type === "video") {
      const percent = Number(req.body.percentWatched);
      const position = Number(req.body.lastPosition);
      const seconds = Number(req.body.secondsWatched);

      if (Number.isFinite(percent)) {
        payload.percentWatched = Math.max(
          Math.min(Math.round(percent), 100),
          read.percentWatched || 0,
        );
      }

      if (Number.isFinite(seconds)) {
        payload.secondsWatched = Math.max(
          Math.round(seconds),
          read.secondsWatched || 0,
        );
      }

      // Where to resume from is the last place they were, not the furthest.
      if (Number.isFinite(position)) {
        payload.lastPosition = Math.round(position);
      }

      const reached =
        (payload.percentWatched ?? read.percentWatched ?? 0) >=
        Slide.VIDEO_COMPLETION_PERCENT;

      if (reached && !read.completed) {
        payload.completed = true;
        payload.completedAt = new Date();
      }
    } else if (!read.completed) {
      payload.completed = true;
      payload.completedAt = new Date();
    }

    if (Object.keys(payload).length) await read.update(payload);

    successResponse(res, {
      complete: isItemComplete(slide, { ...read.toJSON(), ...payload }),
      percentWatched: payload.percentWatched ?? read.percentWatched ?? null,
      lastPosition: payload.lastPosition ?? read.lastPosition ?? null,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Where every enterprise on a programme has got to, for the staff dashboard.
const getProgrammeProgress = async (req, res) => {
  try {
    const programme = await CohortProgram.findOne({
      where: { uuid: req.params.uuid },
    });

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const modules = await Module.findAll({
      attributes: ["id"],
      where: { cohortProgramId: programme.id },
      raw: true,
    });

    const slides = modules.length
      ? await Slide.findAll({
          where: { moduleId: { [Op.in]: modules.map((row) => row.id) } },
          raw: true,
        })
      : [];

    const memberships = await CohortMembership.findAll({
      attributes: ["businessId"],
      where: { cohortProgramId: programme.id },
      raw: true,
    });

    const businesses = memberships.length
      ? await Business.findAll({
          attributes: ["id", "uuid", "name", "email", "userId"],
          where: { id: { [Op.in]: memberships.map((row) => row.businessId) } },
          order: [["name", "ASC"]],
          raw: true,
        })
      : [];

    const userIds = businesses.map((row) => row.userId).filter(Boolean);

    const reads =
      slides.length && userIds.length
        ? await SlideReader.findAll({
            where: {
              slideId: { [Op.in]: slides.map((row) => row.id) },
              userId: { [Op.in]: userIds },
            },
            raw: true,
          })
        : [];

    const byUser = new Map();

    for (const read of reads) {
      const own = byUser.get(read.userId) || new Map();
      own.set(read.slideId, read);
      byUser.set(read.userId, own);
    }

    const rows = businesses.map((business) => {
      const own = byUser.get(business.userId) || new Map();

      const completed = slides.filter((slide) =>
        isItemComplete(slide, own.get(slide.id)),
      ).length;

      return {
        uuid: business.uuid,
        name: business.name,
        email: business.email,
        itemsTotal: slides.length,
        itemsCompleted: completed,
        percent: slides.length
          ? Math.round((completed / slides.length) * 100)
          : 0,
      };
    });

    const averaged = rows.length
      ? Math.round(rows.reduce((sum, row) => sum + row.percent, 0) / rows.length)
      : null;

    successResponse(res, {
      program: programme,
      modules: modules.length,
      items: slides.length,
      learners: rows.length,
      averageCompletion: averaged,
      data: rows,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  getCourseOutline,
  getModuleContent,
  reorderContent,
  recordProgress,
  getProgrammeProgress,
  isItemComplete,
};
