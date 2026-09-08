const { errorResponse, successResponse } = require("../../utils/responses");
const {
  Workshop,
  WorkshopAttendance,
  WorkshopRecording,
  CourseEnrollment,
  LearningResource,
  CohortProgram,
  CohortMembership,
  Business,
  Course,
  Module,
  Slide,
  SlideReader,
  User,
  sequelize,
} = require("../../models");
const { Op } = require("sequelize");

const AUTHOR_ROLES = ["Admin", "Staff", "Reviewer"];
const isAuthor = (req) => AUTHOR_ROLES.includes(req.user && req.user.role);

const findProgramme = (uuid) => CohortProgram.findOne({ where: { uuid } });

// A course filter narrows a programme-scoped list to one of its courses.
const courseFilter = async (req) => {
  const uuid = req.query.course;

  if (!uuid || uuid === "undefined" || uuid === "null") return {};

  const course = await Course.findOne({
    where: { uuid },
    attributes: ["id"],
  });

  // An unknown course matches nothing rather than silently listing everything.
  return { courseId: course ? course.id : 0 };
};

// The course a write belongs to, resolved from the body.
const bodyCourse = async (body) => {
  if (!body.courseUuid) return null;
  return Course.findOne({ where: { uuid: body.courseUuid } });
};

// The enterprise the signed-in learner belongs to, and every programme it is
// on. A startup can hold several memberships, so a workshop is open to it if
// it belongs to any one of them.
const myEnterprise = async (userId) => {
  const business = await Business.findOne({
    where: { userId },
    attributes: ["id", "uuid", "name"],
  });

  if (!business) return null;

  const memberships = await CohortMembership.findAll({
    where: { businessId: business.id },
    attributes: ["cohortProgramId"],
    order: [["createdAt", "DESC"], ["id", "DESC"]],
    raw: true,
  });

  if (!memberships.length) return null;

  return {
    business,
    cohortProgramIds: memberships.map((row) => row.cohortProgramId),
  };
};

const minutesBetween = (from, to) => {
  if (!from || !to) return null;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 60000) : 0;
};

// How long the workshop was scheduled to run, used as the denominator for the
// attendance threshold.
const scheduledMinutes = (workshop) =>
  minutesBetween(workshop.startsAt, workshop.endsAt);

// Work the status out from how much of the workshop the learner was there for.
// A person can always override it; this is the default when times are known.
const statusFromMinutes = (workshop, minutes) => {
  if (!Number.isFinite(minutes)) return "absent";

  const total = scheduledMinutes(workshop);
  if (!total) return minutes > 0 ? "present" : "absent";

  const share = (minutes / total) * 100;

  if (share >= workshop.attendanceThresholdPercent) return "present";
  if (share > 0) return "partial";
  return "absent";
};

const shapeWorkshop = (workshop, extra = {}) => ({
  uuid: workshop.uuid,
  title: workshop.title,
  description: workshop.description,
  objectives: workshop.objectives,
  facilitator:
    workshop.facilitator?.name || workshop.facilitatorName || null,
  startsAt: workshop.startsAt,
  endsAt: workshop.endsAt,
  deliveryMode: workshop.deliveryMode,
  venue: workshop.venue,
  meetingLink: workshop.meetingLink,
  joinWindowMinutes: workshop.joinWindowMinutes,
  attendanceThresholdPercent: workshop.attendanceThresholdPercent,
  attendanceRequired: workshop.attendanceRequired,
  slides: workshop.slides,
  materials: workshop.materials || [],
  status: workshop.status,
  module: workshop.Module
    ? { uuid: workshop.Module.uuid, title: workshop.Module.title }
    : null,
  ...extra,
});

// ------------------------------------------------------------- workshops

const getWorkshops = async (req, res) => {
  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const workshops = await Workshop.findAll({
      where: {
        cohortProgramId: programme.id,
        ...(await courseFilter(req)),
        // A draft is not yet announced to learners.
        ...(isAuthor(req) ? {} : { status: { [Op.ne]: "draft" } }),
      },
      include: [
        { model: Module, required: false, attributes: ["uuid", "title"] },
        {
          model: User,
          as: "facilitator",
          required: false,
          attributes: ["name", "email"],
        },
      ],
      order: [["startsAt", "DESC"]],
    });

    const workshopIds = workshops.map((row) => row.id);

    const attendance = workshopIds.length
      ? await WorkshopAttendance.findAll({
          where: { workshopId: { [Op.in]: workshopIds } },
          raw: true,
        })
      : [];

    const recordings = workshopIds.length
      ? await WorkshopRecording.findAll({
          where: { workshopId: { [Op.in]: workshopIds } },
          order: [["createdAt", "ASC"]],
        })
      : [];

    const enrolled = await CohortMembership.count({
      where: { cohortProgramId: programme.id },
    });

    // A learner sees their own attendance; staff see the tally.
    const mine = isAuthor(req) ? null : await myEnterprise(req.user.id);

    const data = workshops.map((workshop) => {
      const rows = attendance.filter((row) => row.workshopId === workshop.id);
      const present = rows.filter((row) =>
        ["present", "late"].includes(row.status),
      ).length;

      const own = mine
        ? rows.find((row) => row.businessId === mine.business.id)
        : null;

      return shapeWorkshop(workshop, {
        recordings: recordings
          .filter((row) => row.workshopId === workshop.id)
          .map((row) => ({
            uuid: row.uuid,
            title: row.title,
            file: row.file,
            url: row.url,
            durationSeconds: row.durationSeconds,
            access: row.access,
            publishedToCourse: !!row.slideId,
          })),
        attendance: {
          expected: enrolled,
          recorded: rows.length,
          present,
          // Null while nobody is enrolled — a rate over zero people is
          // meaningless, not 0%.
          ratePercent: enrolled
            ? Math.round((present / enrolled) * 100)
            : null,
        },
        myAttendance: own
          ? { status: own.status, minutes: own.minutes }
          : null,
      });
    });

    successResponse(res, { program: programme, data, count: data.length });
  } catch (error) {
    errorResponse(res, error);
  }
};

const createWorkshop = async (req, res) => {
  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const { title, startsAt } = req.body;

    if (!String(title || "").trim()) {
      return res
        .status(400)
        .json({ status: false, message: "A workshop title is required" });
    }

    if (!startsAt || Number.isNaN(new Date(startsAt).getTime())) {
      return res
        .status(400)
        .json({ status: false, message: "A start date and time is required" });
    }

    if (
      req.body.endsAt &&
      new Date(req.body.endsAt) <= new Date(startsAt)
    ) {
      return res.status(400).json({
        status: false,
        message: "The workshop cannot end before it starts",
      });
    }

    const course = await bodyCourse(req.body);

    if (req.body.courseUuid && !course) {
      return res
        .status(404)
        .json({ status: false, message: "Course not found" });
    }

    let moduleId = null;

    if (req.body.moduleUuid) {
      const module = await Module.findOne({
        where: { uuid: req.body.moduleUuid, cohortProgramId: programme.id },
      });

      if (!module) {
        return res
          .status(404)
          .json({ status: false, message: "Module not found" });
      }

      moduleId = module.id;
    }

    const mode = Workshop.MODES.includes(req.body.deliveryMode)
      ? req.body.deliveryMode
      : "online";

    if (["online", "hybrid"].includes(mode) && !req.body.meetingLink) {
      return res.status(400).json({
        status: false,
        message: "An online workshop needs a meeting link",
      });
    }

    const workshop = await Workshop.create({
      cohortProgramId: programme.id,
      courseId: course ? course.id : null,
      moduleId,
      title: String(title).trim(),
      description: req.body.description || null,
      objectives: req.body.objectives || null,
      facilitatorName: req.body.facilitatorName || null,
      startsAt,
      endsAt: req.body.endsAt || null,
      deliveryMode: mode,
      venue: req.body.venue || null,
      meetingLink: req.body.meetingLink || null,
      joinWindowMinutes: Number.isFinite(Number(req.body.joinWindowMinutes))
        ? Number(req.body.joinWindowMinutes)
        : 15,
      attendanceThresholdPercent: Number.isFinite(
        Number(req.body.attendanceThresholdPercent),
      )
        ? Number(req.body.attendanceThresholdPercent)
        : 75,
      attendanceRequired: !!req.body.attendanceRequired,
      slides: req.body.slides || null,
      materials: Array.isArray(req.body.materials) ? req.body.materials : null,
      status: Workshop.STATUSES.includes(req.body.status)
        ? req.body.status
        : "scheduled",
      createdById: req.user ? req.user.id : null,
    });

    successResponse(res, { uuid: workshop.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateWorkshop = async (req, res) => {
  try {
    const workshop = await Workshop.findOne({
      where: { uuid: req.params.workshopUuid },
    });

    if (!workshop) {
      return res
        .status(404)
        .json({ status: false, message: "Workshop not found" });
    }

    const payload = {};

    for (const field of [
      "title",
      "description",
      "objectives",
      "facilitatorName",
      "startsAt",
      "endsAt",
      "venue",
      "meetingLink",
      "slides",
    ]) {
      if (req.body[field] !== undefined) payload[field] = req.body[field];
    }

    for (const field of [
      "joinWindowMinutes",
      "attendanceThresholdPercent",
    ]) {
      if (req.body[field] !== undefined && Number.isFinite(Number(req.body[field]))) {
        payload[field] = Number(req.body[field]);
      }
    }

    if (req.body.attendanceRequired !== undefined) {
      payload.attendanceRequired = !!req.body.attendanceRequired;
    }

    if (Workshop.MODES.includes(req.body.deliveryMode)) {
      payload.deliveryMode = req.body.deliveryMode;
    }

    if (Workshop.STATUSES.includes(req.body.status)) {
      payload.status = req.body.status;
    }

    if (Array.isArray(req.body.materials)) {
      payload.materials = req.body.materials;
    }

    const startsAt = payload.startsAt ?? workshop.startsAt;
    const endsAt = payload.endsAt ?? workshop.endsAt;

    if (endsAt && new Date(endsAt) <= new Date(startsAt)) {
      return res.status(400).json({
        status: false,
        message: "The workshop cannot end before it starts",
      });
    }

    await workshop.update(payload);

    successResponse(res, { uuid: workshop.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteWorkshop = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const workshop = await Workshop.findOne({
      where: { uuid: req.params.workshopUuid },
    });

    if (!workshop) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Workshop not found" });
    }

    // Attendance and recordings go with it. A recording already published
    // into a course keeps its lesson item — the media is the same file, and
    // removing the workshop should not pull a lesson out from under learners.
    await WorkshopAttendance.destroy({
      where: { workshopId: workshop.id },
      transaction,
    });
    await WorkshopRecording.destroy({
      where: { workshopId: workshop.id },
      transaction,
    });
    await workshop.destroy({ transaction });

    await transaction.commit();

    successResponse(res, { deleted: true });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

// ------------------------------------------------------------ attendance

// The register: every enterprise on the programme, with whatever has been
// recorded for this workshop so far.
const getAttendance = async (req, res) => {
  try {
    const workshop = await Workshop.findOne({
      where: { uuid: req.params.workshopUuid },
    });

    if (!workshop) {
      return res
        .status(404)
        .json({ status: false, message: "Workshop not found" });
    }

    const memberships = await CohortMembership.findAll({
      attributes: ["businessId"],
      where: { cohortProgramId: workshop.cohortProgramId },
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

    const rows = await WorkshopAttendance.findAll({
      where: { workshopId: workshop.id },
      raw: true,
    });

    const byBusiness = new Map(rows.map((row) => [row.businessId, row]));

    const data = businesses.map((business) => {
      const record = byBusiness.get(business.id);

      return {
        businessUuid: business.uuid,
        name: business.name,
        email: business.email,
        status: record ? record.status : null,
        minutes: record ? record.minutes : null,
        joinedAt: record ? record.joinedAt : null,
        leftAt: record ? record.leftAt : null,
        notes: record ? record.notes : null,
      };
    });

    const present = data.filter((row) =>
      ["present", "late"].includes(row.status),
    ).length;

    successResponse(res, {
      workshop: shapeWorkshop(workshop),
      scheduledMinutes: scheduledMinutes(workshop),
      expected: data.length,
      present,
      ratePercent: data.length
        ? Math.round((present / data.length) * 100)
        : null,
      data,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Record the register in one go. An explicit status wins; otherwise it is
// worked out from how long the enterprise was there.
const recordAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const workshop = await Workshop.findOne({
      where: { uuid: req.params.workshopUuid },
    });

    if (!workshop) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Workshop not found" });
    }

    const entries = Array.isArray(req.body.attendance)
      ? req.body.attendance
      : [];

    let saved = 0;

    for (const entry of entries) {
      const business = await Business.findOne({
        where: { uuid: entry.businessUuid },
        attributes: ["id", "userId"],
      });

      if (!business) continue;

      const minutes = Number.isFinite(Number(entry.minutes))
        ? Number(entry.minutes)
        : minutesBetween(entry.joinedAt, entry.leftAt);

      const status = WorkshopAttendance.STATUSES.includes(entry.status)
        ? entry.status
        : statusFromMinutes(workshop, minutes);

      const [record] = await WorkshopAttendance.findOrCreate({
        where: { workshopId: workshop.id, businessId: business.id },
        defaults: {
          workshopId: workshop.id,
          businessId: business.id,
          userId: business.userId,
        },
        transaction,
      });

      await record.update(
        {
          status,
          minutes: Number.isFinite(minutes) ? minutes : null,
          joinedAt: entry.joinedAt || record.joinedAt,
          leftAt: entry.leftAt || record.leftAt,
          notes: entry.notes !== undefined ? entry.notes : record.notes,
          recordedById: req.user ? req.user.id : null,
        },
        { transaction },
      );

      saved += 1;
    }

    await transaction.commit();

    successResponse(res, { recorded: saved });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

// A learner opening the meeting link. Marks them as having joined, so an
// online workshop has a starting point for attendance without anyone typing
// it in. Leaving is recorded separately or set by staff.
const joinWorkshop = async (req, res) => {
  try {
    const workshop = await Workshop.findOne({
      where: { uuid: req.params.workshopUuid },
    });

    if (!workshop) {
      return res
        .status(404)
        .json({ status: false, message: "Workshop not found" });
    }

    const mine = await myEnterprise(req.user.id);

    if (!mine || !mine.cohortProgramIds.includes(workshop.cohortProgramId)) {
      return res
        .status(403)
        .json({ status: false, message: "This workshop is not open to you" });
    }

    // The join link only opens inside its window, so attendance means what it
    // says rather than recording a click made days earlier.
    const opensAt =
      new Date(workshop.startsAt).getTime() -
      workshop.joinWindowMinutes * 60000;

    const closesAt = workshop.endsAt
      ? new Date(workshop.endsAt).getTime()
      : new Date(workshop.startsAt).getTime() + 4 * 3600000;

    const now = Date.now();

    if (now < opensAt) {
      return res.status(400).json({
        status: false,
        message: `This workshop opens ${workshop.joinWindowMinutes} minutes before it starts`,
      });
    }

    if (now > closesAt) {
      return res
        .status(400)
        .json({ status: false, message: "This workshop has finished" });
    }

    const [record] = await WorkshopAttendance.findOrCreate({
      where: { workshopId: workshop.id, businessId: mine.business.id },
      defaults: {
        workshopId: workshop.id,
        businessId: mine.business.id,
        userId: req.user.id,
        joinedAt: new Date(),
        status: "present",
      },
    });

    if (!record.joinedAt) {
      await record.update({ joinedAt: new Date(), status: "present" });
    }

    successResponse(res, {
      meetingLink: workshop.meetingLink,
      joinedAt: record.joinedAt,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ------------------------------------------------------------ recordings

const addRecording = async (req, res) => {
  try {
    const workshop = await Workshop.findOne({
      where: { uuid: req.params.workshopUuid },
    });

    if (!workshop) {
      return res
        .status(404)
        .json({ status: false, message: "Workshop not found" });
    }

    if (!req.body.file && !req.body.url) {
      return res.status(400).json({
        status: false,
        message: "A recording needs either an uploaded file or a link",
      });
    }

    const recording = await WorkshopRecording.create({
      workshopId: workshop.id,
      title: String(req.body.title || workshop.title).trim(),
      file: req.body.file || null,
      url: req.body.url || null,
      durationSeconds: Number.isFinite(Number(req.body.durationSeconds))
        ? Number(req.body.durationSeconds)
        : null,
      thumbnail: req.body.thumbnail || null,
      access: WorkshopRecording.ACCESS.includes(req.body.access)
        ? req.body.access
        : "programme",
      createdById: req.user ? req.user.id : null,
    });

    successResponse(res, { uuid: recording.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Publish a recording into a course as a lesson content item.
//
// The lesson item points at the same file or URL the recording already uses —
// nothing is copied, so there is only ever one piece of media.
const publishRecording = async (req, res) => {
  try {
    const recording = await WorkshopRecording.findOne({
      where: { uuid: req.params.recordingUuid },
      include: [{ model: Workshop }],
    });

    if (!recording) {
      return res
        .status(404)
        .json({ status: false, message: "Recording not found" });
    }

    if (recording.slideId) {
      return res.status(409).json({
        status: false,
        message: "This recording is already in a module",
      });
    }

    const module = await Module.findOne({
      where: { uuid: req.body.moduleUuid },
    });

    if (!module) {
      return res
        .status(404)
        .json({ status: false, message: "Module not found" });
    }

    const position = await Slide.count({ where: { moduleId: module.id } });

    const slide = await Slide.create({
      title: req.body.title || recording.title,
      type: "video",
      file: recording.file,
      url: recording.url,
      durationSeconds: recording.durationSeconds,
      thumbnail: recording.thumbnail,
      description: `Recording of the workshop "${recording.Workshop.title}".`,
      moduleId: module.id,
      position,
      downloadable: false,
    });

    await recording.update({ slideId: slide.id });

    successResponse(res, { contentUuid: slide.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteRecording = async (req, res) => {
  try {
    const recording = await WorkshopRecording.findOne({
      where: { uuid: req.params.recordingUuid },
    });

    if (!recording) {
      return res
        .status(404)
        .json({ status: false, message: "Recording not found" });
    }

    if (recording.slideId) {
      return res.status(409).json({
        status: false,
        message:
          "This recording is in a module. Remove it from the module first.",
      });
    }

    await recording.destroy();

    successResponse(res, { deleted: true });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ----------------------------------------------------------- enrolments

// The learning roster: everyone on the programme, with their progress through
// the required lessons and the workshops they attended.
//
// Progress is recomputed from lesson records on every read, and the stored
// status is refreshed to match, so the two can never drift apart.
const getEnrollments = async (req, res) => {
  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const memberships = await CohortMembership.findAll({
      attributes: ["businessId", "createdAt"],
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

    // Anyone on the programme without a learning record gets one now, so the
    // roster is never missing people who joined before this existed.
    for (const business of businesses) {
      const joined = memberships.find(
        (row) => row.businessId === business.id,
      );

      await CourseEnrollment.findOrCreate({
        where: { cohortProgramId: programme.id, businessId: business.id },
        defaults: {
          cohortProgramId: programme.id,
          businessId: business.id,
          userId: business.userId,
          enrolledAt: joined ? joined.createdAt : new Date(),
        },
      });
    }

    const enrollments = await CourseEnrollment.findAll({
      where: { cohortProgramId: programme.id },
    });

    // Required lessons and their content, to work out where each learner is.
    const modules = await Module.findAll({
      attributes: ["id"],
      where: { cohortProgramId: programme.id },
      raw: true,
    });

    const lessons = modules.length
      ? await Lesson.findAll({
          where: {
            moduleId: { [Op.in]: modules.map((row) => row.id) },
            archivedAt: null,
            status: "published",
            required: true,
          },
          raw: true,
        })
      : [];

    const slides = lessons.length
      ? await Slide.findAll({
          where: { lessonId: { [Op.in]: lessons.map((row) => row.id) } },
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

    const readsByUser = new Map();

    for (const read of reads) {
      const list = readsByUser.get(read.userId) || new Map();
      list.set(read.slideId, read);
      readsByUser.set(read.userId, list);
    }

    const slideById = new Map(slides.map((row) => [row.id, row]));

    const done = (slide, read) => {
      if (!read) return false;
      if (slide.type !== "video") return !!read.completed;
      if (read.completed) return true;
      const percent = Number(read.percentWatched);
      return (
        Number.isFinite(percent) && percent >= Slide.VIDEO_COMPLETION_PERCENT
      );
    };

    // Workshops attended, alongside the lesson progress.
    const workshops = await Workshop.findAll({
      attributes: ["id", "attendanceRequired"],
      where: { cohortProgramId: programme.id },
      raw: true,
    });

    const attendance = workshops.length
      ? await WorkshopAttendance.findAll({
          where: { workshopId: { [Op.in]: workshops.map((row) => row.id) } },
          raw: true,
        })
      : [];

    const requiredWorkshops = workshops.filter(
      (row) => row.attendanceRequired,
    );

    const enrollmentBy = new Map(
      enrollments.map((row) => [row.businessId, row]),
    );

    const now = new Date();
    const data = [];

    for (const business of businesses) {
      const record = enrollmentBy.get(business.id);
      const mine = readsByUser.get(business.userId) || new Map();

      const completedLessons = lessons.filter((lesson) => {
        const items = slides.filter((slide) => slide.lessonId === lesson.id);
        if (items.length === 0) return false;
        return items.every((slide) =>
          done(slideById.get(slide.id), mine.get(slide.id)),
        );
      }).length;

      const percent = lessons.length
        ? Math.round((completedLessons / lessons.length) * 100)
        : 0;

      const attended = attendance.filter(
        (row) =>
          row.businessId === business.id &&
          ["present", "late"].includes(row.status),
      );

      const requiredAttended = requiredWorkshops.filter((workshop) =>
        attended.some((row) => row.workshopId === workshop.id),
      ).length;

      // Completion needs the lessons AND any workshop marked required.
      const finished =
        lessons.length > 0 &&
        completedLessons === lessons.length &&
        requiredAttended === requiredWorkshops.length;

      let status = "not_started";

      if (record?.status === "archived") {
        status = "archived";
      } else if (finished) {
        status = "completed";
      } else if (percent > 0 || attended.length > 0) {
        status = record?.dueAt && new Date(record.dueAt) < now
          ? "overdue"
          : "in_progress";
      } else if (record?.dueAt && new Date(record.dueAt) < now) {
        status = "overdue";
      }

      if (record) {
        const changes = { progressPercent: percent, status };

        if (!record.startedAt && (percent > 0 || attended.length > 0)) {
          changes.startedAt = now;
        }

        if (finished && !record.completedAt) changes.completedAt = now;
        if (!finished && record.completedAt) changes.completedAt = null;

        await record.update(changes);
      }

      data.push({
        uuid: record ? record.uuid : null,
        businessUuid: business.uuid,
        name: business.name,
        email: business.email,
        enrolledAt: record ? record.enrolledAt : null,
        startedAt: record ? record.startedAt : null,
        completedAt: record ? record.completedAt : null,
        dueAt: record ? record.dueAt : null,
        lessonsTotal: lessons.length,
        lessonsCompleted: completedLessons,
        workshopsAttended: attended.length,
        requiredWorkshops: requiredWorkshops.length,
        progressPercent: percent,
        status,
      });
    }

    const averaged = data.length
      ? Math.round(
          data.reduce((sum, row) => sum + row.progressPercent, 0) /
            data.length,
        )
      : null;

    successResponse(res, {
      program: programme,
      requiredLessons: lessons.length,
      requiredWorkshops: requiredWorkshops.length,
      learners: data.length,
      averageProgress: averaged,
      completed: data.filter((row) => row.status === "completed").length,
      notStarted: data.filter((row) => row.status === "not_started").length,
      data,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Set a learning deadline or archive a learner's enrolment. Progress itself is
// never set by hand — it is always derived from what they actually did.
const updateEnrollment = async (req, res) => {
  try {
    const record = await CourseEnrollment.findOne({
      where: { uuid: req.params.enrollmentUuid },
    });

    if (!record) {
      return res
        .status(404)
        .json({ status: false, message: "Enrollment not found" });
    }

    const payload = {};

    if (req.body.dueAt !== undefined) payload.dueAt = req.body.dueAt || null;

    // Only archiving is settable; every other status is computed.
    if (req.body.status === "archived") payload.status = "archived";
    if (req.body.status === "active" && record.status === "archived") {
      payload.status = "in_progress";
    }

    await record.update(payload);

    successResponse(res, { uuid: record.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ------------------------------------------------------------- resources

const getResources = async (req, res) => {
  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const resources = await LearningResource.findAll({
      where: {
        cohortProgramId: programme.id,
        archivedAt: null,
        ...(await courseFilter(req)),
      },
      include: [
        { model: Module, required: false, attributes: ["uuid", "title"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    successResponse(res, {
      program: programme,
      data: resources.map((row) => ({
        uuid: row.uuid,
        title: row.title,
        description: row.description,
        type: row.type,
        category: row.category,
        tags: row.tags || [],
        file: row.file,
        url: row.url,
        downloadable: row.downloadable,
        module: row.Module
          ? { uuid: row.Module.uuid, title: row.Module.title }
          : null,

        createdAt: row.createdAt,
      })),
      count: resources.length,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const createResource = async (req, res) => {
  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    if (!String(req.body.title || "").trim()) {
      return res
        .status(400)
        .json({ status: false, message: "A resource title is required" });
    }

    if (!req.body.file && !req.body.url) {
      return res.status(400).json({
        status: false,
        message: "A resource needs either an uploaded file or a link",
      });
    }

    const course = await bodyCourse(req.body);

    if (req.body.courseUuid && !course) {
      return res
        .status(404)
        .json({ status: false, message: "Course not found" });
    }

    let moduleId = null;

    if (req.body.moduleUuid) {
      const module = await Module.findOne({
        where: { uuid: req.body.moduleUuid, cohortProgramId: programme.id },
      });
      if (module) moduleId = module.id;
    }



    const resource = await LearningResource.create({
      cohortProgramId: programme.id,
      courseId: course ? course.id : null,
      moduleId,
      title: String(req.body.title).trim(),
      description: req.body.description || null,
      type: LearningResource.TYPES.includes(req.body.type)
        ? req.body.type
        : "template",
      category: req.body.category || null,
      tags: Array.isArray(req.body.tags) ? req.body.tags : null,
      file: req.body.file || null,
      url: req.body.url || null,
      downloadable: req.body.downloadable !== false,
      uploadedById: req.user ? req.user.id : null,
    });

    successResponse(res, { uuid: resource.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

const archiveResource = async (req, res) => {
  try {
    const resource = await LearningResource.findOne({
      where: { uuid: req.params.resourceUuid },
    });

    if (!resource) {
      return res
        .status(404)
        .json({ status: false, message: "Resource not found" });
    }

    await resource.update({ archivedAt: new Date() });

    successResponse(res, { archived: true });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  getWorkshops,
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
  getAttendance,
  recordAttendance,
  joinWorkshop,
  addRecording,
  publishRecording,
  deleteRecording,
  getEnrollments,
  updateEnrollment,
  getResources,
  createResource,
  archiveResource,
};
