const { errorResponse, successResponse } = require("../../utils/responses");
const {
  Course,
  CourseEnrollment,
  CohortProgram,
  CohortMembership,
  Business,
  Module,
  Slide,
  SlideReader,
  Workshop,
  WorkshopAttendance,
  WorkshopRecording,
  LearningResource,
  Notification,
  sequelize,
} = require("../../models");
const { Op } = require("sequelize");

const AUTHOR_ROLES = ["Admin", "Staff", "Reviewer"];
const isAuthor = (req) => AUTHOR_ROLES.includes(req.user && req.user.role);

const findProgramme = (uuid) => CohortProgram.findOne({ where: { uuid } });

// The enterprise the signed-in learner belongs to, and every programme it is
// on. A startup can hold several memberships, so access has to be judged
// against the whole set — checking one would lock a learner out of the courses
// on their other programmes.
//
// Ordered most recently joined first, so cohortProgramIds[0] is the programme
// the learner is currently working through, for the routes that have to pick
// one. Returns null when the user has no business, or a business on no
// programme at all, which both mean "no courses to show".
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

// Whether one learner has finished one content item. A video has to have been
// watched; everything else counts once it has been opened.
const isItemComplete = (slide, read) => {
  if (!read) return false;
  if (slide.type !== "video") return !!read.completed;
  if (read.completed) return true;

  const percent = Number(read.percentWatched);
  return Number.isFinite(percent) && percent >= Slide.VIDEO_COMPLETION_PERCENT;
};

// How far a set of users have got through a course's content.
// Returns a Map of userId -> { total, completed, percent }.
const courseProgressByUser = async (courseId, userIds = []) => {
  const modules = await Module.findAll({
    attributes: ["id"],
    where: { courseId },
    raw: true,
  });

  const slides = modules.length
    ? await Slide.findAll({
        where: { moduleId: { [Op.in]: modules.map((row) => row.id) } },
        raw: true,
      })
    : [];

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

  const result = new Map();

  for (const userId of userIds) {
    const own = byUser.get(userId) || new Map();

    const completed = slides.filter((slide) =>
      isItemComplete(slide, own.get(slide.id)),
    ).length;

    result.set(userId, {
      total: slides.length,
      completed,
      percent: slides.length
        ? Math.round((completed / slides.length) * 100)
        : 0,
    });
  }

  return { items: slides.length, byUser: result };
};

// Tell the programme's startups that a course is open to them, through the
// platform's own notification centre. One row per user, because Notification
// addresses either a single user or a whole role — there is no group form.
//
// A notification failing must never fail the course write that triggered it.
const announceCourse = async (course) => {
  try {
    const memberships = await CohortMembership.findAll({
      attributes: ["businessId"],
      where: { cohortProgramId: course.cohortProgramId },
      raw: true,
    });

    if (memberships.length === 0) return;

    const businesses = await Business.findAll({
      attributes: ["userId"],
      where: { id: { [Op.in]: memberships.map((row) => row.businessId) } },
      raw: true,
    });

    const userIds = [
      ...new Set(businesses.map((row) => row.userId).filter(Boolean)),
    ];

    if (userIds.length === 0) return;

    await Notification.bulkCreate(
      userIds.map((userId) => ({
        userId,
        message: `A new course is available: ${course.title}`,
      })),
    );
  } catch (error) {
    console.error("Could not announce the course:", error.message);
  }
};

const shapeCourse = (course, extra = {}) => ({
  uuid: course.uuid,
  title: course.title,
  description: course.description,
  image: course.image,
  objectives: course.objectives,
  estimatedHours: course.estimatedHours,
  startDate: course.startDate,
  endDate: course.endDate,
  status: course.status,
  selfEnroll: course.selfEnroll,
  required: course.required,
  position: course.position,
  ...extra,
});

// ---------------------------------------------------------------- listing

// The courses of one programme. Staff see drafts; a learner sees published
// courses on their own programme, each marked with whether they are enrolled.
const getCourses = async (req, res) => {
  try {
    let programme;
    let mine = null;

    if (req.params.uuid === "mine") {
      mine = await myEnterprise(req.user.id);

      if (!mine) {
        return successResponse(res, { program: null, data: [], count: 0 });
      }

      // "mine" resolves to one programme, so it takes the most recent.
      programme = await CohortProgram.findByPk(mine.cohortProgramIds[0]);
    } else {
      programme = await findProgramme(req.params.uuid);

      if (!isAuthor(req)) mine = await myEnterprise(req.user.id);
    }

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const courses = await Course.findAll({
      where: {
        cohortProgramId: programme.id,
        archivedAt: null,
        ...(isAuthor(req) ? {} : { status: "published" }),
      },
      order: [
        ["position", "ASC"],
        ["createdAt", "ASC"],
      ],
    });

    const courseIds = courses.map((row) => row.id);

    // Counts for the course cards, gathered in one query each.
    const [modules, workshops, resources, enrollments] = await Promise.all([
      courseIds.length
        ? Module.findAll({
            attributes: ["id", "courseId"],
            where: { courseId: { [Op.in]: courseIds } },
            raw: true,
          })
        : [],
      courseIds.length
        ? Workshop.findAll({
            attributes: ["id", "courseId"],
            where: { courseId: { [Op.in]: courseIds } },
            raw: true,
          })
        : [],
      courseIds.length
        ? LearningResource.findAll({
            attributes: ["id", "courseId"],
            where: { courseId: { [Op.in]: courseIds }, archivedAt: null },
            raw: true,
          })
        : [],
      courseIds.length
        ? CourseEnrollment.findAll({
            where: { courseId: { [Op.in]: courseIds } },
            raw: true,
          })
        : [],
    ]);

    const countBy = (rows, courseId) =>
      rows.filter((row) => row.courseId === courseId).length;

    const data = courses.map((course) =>
      shapeCourse(course, {
        modules: countBy(modules, course.id),
        workshops: countBy(workshops, course.id),
        resources: countBy(resources, course.id),
        enrolled: countBy(enrollments, course.id),
        // A learner needs to know where they stand with each course.
        myEnrollment: mine
          ? (() => {
              const row = enrollments.find(
                (item) =>
                  item.courseId === course.id &&
                  item.businessId === mine.business.id,
              );

              return row
                ? {
                    status: row.status,
                    progressPercent: row.progressPercent,
                    enrolledAt: row.enrolledAt,
                  }
                : null;
            })()
          : null,
      }),
    );

    successResponse(res, {
      program: programme,
      data,
      count: data.length,
      canManage: isAuthor(req),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// How many published courses on the learner's programme they have not taken
// up yet. This is what the Class Rooms badge counts, so it clears itself the
// moment they enrol rather than needing a "mark as read" step.
const getNewCourseCount = async (req, res) => {
  try {
    const mine = await myEnterprise(req.user.id);

    if (!mine) return successResponse(res, { count: 0 });

    const courses = await Course.findAll({
      attributes: ["id"],
      where: {
        // New courses across every programme the startup is on.
        cohortProgramId: { [Op.in]: mine.cohortProgramIds },
        archivedAt: null,
        status: "published",
      },
      raw: true,
    });

    if (courses.length === 0) return successResponse(res, { count: 0 });

    const enrolled = await CourseEnrollment.findAll({
      attributes: ["courseId"],
      where: {
        businessId: mine.business.id,
        courseId: { [Op.in]: courses.map((row) => row.id) },
      },
      raw: true,
    });

    const taken = new Set(enrolled.map((row) => row.courseId));

    successResponse(res, {
      count: courses.filter((row) => !taken.has(row.id)).length,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// One course, with its programme and what it contains.
const getCourse = async (req, res) => {
  try {
    const course = await Course.findOne({
      where: { uuid: req.params.courseUuid },
      include: [{ model: CohortProgram }],
    });

    if (!course || course.archivedAt) {
      return res
        .status(404)
        .json({ status: false, message: "Course not found" });
    }

    let myEnrollment = null;

    if (!isAuthor(req)) {
      const mine = await myEnterprise(req.user.id);

      // A learner may only open a published course on one of their programmes.
      if (
        !mine ||
        !mine.cohortProgramIds.includes(course.cohortProgramId) ||
        course.status !== "published"
      ) {
        return res
          .status(403)
          .json({ status: false, message: "This course is not open to you" });
      }

      const row = await CourseEnrollment.findOne({
        where: { courseId: course.id, businessId: mine.business.id },
      });

      myEnrollment = row
        ? {
            status: row.status,
            progressPercent: row.progressPercent,
            enrolledAt: row.enrolledAt,
          }
        : null;
    }

    // The syllabus for the course page: what each module is and how much is
    // in it. Deliberately no slide content — that is for enrolled learners,
    // and this page is open to anyone on the programme deciding whether to
    // take the course.
    const moduleRows = await Module.findAll({
      where: { courseId: course.id },
      order: [["createdAt", "ASC"]],
    });

    const moduleIds = moduleRows.map((row) => row.id);

    const slides = moduleIds.length
      ? await Slide.findAll({
          attributes: ["id", "moduleId", "type", "durationSeconds"],
          where: { moduleId: { [Op.in]: moduleIds } },
          raw: true,
        })
      : [];

    const [workshops, resources, enrolled] = await Promise.all([
      Workshop.count({ where: { courseId: course.id } }),
      LearningResource.count({
        where: { courseId: course.id, archivedAt: null },
      }),
      CourseEnrollment.count({ where: { courseId: course.id } }),
    ]);

    const modules = moduleRows.length;

    // How far this learner has got, so the syllabus can lock the modules they
    // have not reached yet. Read rows carry the completion flags that
    // isItemComplete needs, so they are fetched whole rather than by id.
    const myReads = slides.length
      ? await SlideReader.findAll({
          where: {
            slideId: { [Op.in]: slides.map((row) => row.id) },
            userId: req.user.id,
          },
          raw: true,
        })
      : [];

    const readBySlide = new Map(myReads.map((read) => [read.slideId, read]));

    // Modules open in order: the next one unlocks when the one before it is
    // finished. Authors see the whole syllabus — they are building it, not
    // working through it.
    //
    // Tracked as "every earlier module is done" rather than "the one before is
    // done", so an empty module in the middle cannot silently unlock the rest.
    const author = isAuthor(req);
    let earlierComplete = true;

    const syllabus = moduleRows.map((module) => {
      const items = slides.filter((row) => row.moduleId === module.id);

      const seconds = items.reduce(
        (total, row) => total + (Number(row.durationSeconds) || 0),
        0,
      );

      const completedItems = items.filter((slide) =>
        isItemComplete(slide, readBySlide.get(slide.id)),
      ).length;

      // A module with no content cannot be finished, so it does not gate the
      // ones after it — otherwise an empty placeholder would lock the course.
      const complete = items.length > 0 && completedItems === items.length;
      const locked = !author && !earlierComplete;

      if (items.length > 0) earlierComplete = earlierComplete && complete;

      return {
        uuid: module.uuid,
        title: module.title,
        description: module.description,
        image: module.image,
        items: items.length,
        videos: items.filter((row) => row.type === "video").length,
        // Null rather than 0 when no item states a duration.
        minutes: seconds > 0 ? Math.round(seconds / 60) : null,
        completedItems,
        complete,
        locked,
      };
    });

    successResponse(res, {
      ...shapeCourse(course, {
        modules,
        workshops,
        resources,
        enrolled,
        myEnrollment,
        syllabus,
      }),
      program: course.CohortProgram
        ? {
            uuid: course.CohortProgram.uuid,
            title: course.CohortProgram.title,
            category: course.CohortProgram.category,
            image: course.CohortProgram.image,
            startDate: course.CohortProgram.startDate,
            endDate: course.CohortProgram.endDate,
          }
        : null,
      canManage: isAuthor(req),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ----------------------------------------------------------------- writes

const readPayload = (body) => {
  const payload = {};

  for (const field of [
    "title",
    "description",
    "image",
    "objectives",
    "startDate",
    "endDate",
  ]) {
    if (body[field] !== undefined) payload[field] = body[field] || null;
  }

  if (body.estimatedHours !== undefined) {
    payload.estimatedHours = Number.isFinite(Number(body.estimatedHours))
      ? Number(body.estimatedHours)
      : null;
  }

  if (body.selfEnroll !== undefined) payload.selfEnroll = !!body.selfEnroll;
  if (body.required !== undefined) payload.required = !!body.required;

  if (Course.STATUSES.includes(body.status)) payload.status = body.status;

  return payload;
};

const createCourse = async (req, res) => {
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
        .json({ status: false, message: "A course title is required" });
    }

    const payload = readPayload(req.body);

    if (
      payload.startDate &&
      payload.endDate &&
      new Date(payload.startDate) > new Date(payload.endDate)
    ) {
      return res.status(400).json({
        status: false,
        message: "The course cannot end before it starts",
      });
    }

    const position = await Course.count({
      where: { cohortProgramId: programme.id, archivedAt: null },
    });

    const course = await Course.create({
      ...payload,
      title: String(req.body.title).trim(),
      cohortProgramId: programme.id,
      position,
      createdById: req.user ? req.user.id : null,
    });

    // Only a published course is announced — a draft is not open to anyone.
    if (course.status === "published") await announceCourse(course);

    successResponse(res, { uuid: course.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateCourse = async (req, res) => {
  try {
    const course = await Course.findOne({
      where: { uuid: req.params.courseUuid },
    });

    if (!course) {
      return res
        .status(404)
        .json({ status: false, message: "Course not found" });
    }

    const payload = readPayload(req.body);

    if (payload.title !== undefined && !String(payload.title).trim()) {
      return res
        .status(400)
        .json({ status: false, message: "A course title is required" });
    }

    const startDate = payload.startDate ?? course.startDate;
    const endDate = payload.endDate ?? course.endDate;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        status: false,
        message: "The course cannot end before it starts",
      });
    }

    const wasDraft = course.status !== "published";

    await course.update(payload);

    // A course that has just been published is new to its startups, even
    // though the row itself is not.
    if (wasDraft && course.status === "published") {
      await announceCourse(course);
    }

    successResponse(res, { uuid: course.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Archive rather than delete: learners have progress and enrolments against a
// course, and that record has to survive.
const archiveCourse = async (req, res) => {
  try {
    const course = await Course.findOne({
      where: { uuid: req.params.courseUuid },
    });

    if (!course) {
      return res
        .status(404)
        .json({ status: false, message: "Course not found" });
    }

    await course.update({ status: "archived", archivedAt: new Date() });

    successResponse(res, { archived: true });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Permanently remove a course and everything inside it.
//
// Archiving is the usual way to retire a course, because it keeps enrolments
// and learner progress. This is the deliberate alternative, so it says exactly
// what it destroyed rather than reporting a bare success.
const deleteCourse = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const course = await Course.findOne({
      where: { uuid: req.params.courseUuid },
    });

    if (!course) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Course not found" });
    }

    const removed = {
      modules: 0,
      content: 0,
      workshops: 0,
      recordings: 0,
      resources: 0,
      enrollments: 0,
    };

    // --- modules, and everything under them ---------------------------
    const modules = await Module.findAll({
      attributes: ["id"],
      where: { courseId: course.id },
      raw: true,
      transaction,
    });

    const moduleIds = modules.map((row) => row.id);
    removed.modules = moduleIds.length;

    if (moduleIds.length) {
      const slides = await Slide.findAll({
        attributes: ["id"],
        where: { moduleId: { [Op.in]: moduleIds } },
        raw: true,
        transaction,
      });

      const slideIds = slides.map((row) => row.id);
      removed.content = slideIds.length;

      if (slideIds.length) {
        // Progress rows first — they point at the slides.
        await SlideReader.destroy({
          where: { slideId: { [Op.in]: slideIds } },
          transaction,
        });
        await Slide.destroy({
          where: { id: { [Op.in]: slideIds } },
          transaction,
        });
      }

      await Module.destroy({
        where: { id: { [Op.in]: moduleIds } },
        transaction,
      });
    }

    // --- workshops, their register and recordings ---------------------
    const workshops = await Workshop.findAll({
      attributes: ["id"],
      where: { courseId: course.id },
      raw: true,
      transaction,
    });

    const workshopIds = workshops.map((row) => row.id);
    removed.workshops = workshopIds.length;

    if (workshopIds.length) {
      removed.recordings = await WorkshopRecording.count({
        where: { workshopId: { [Op.in]: workshopIds } },
        transaction,
      });

      await WorkshopAttendance.destroy({
        where: { workshopId: { [Op.in]: workshopIds } },
        transaction,
      });
      await WorkshopRecording.destroy({
        where: { workshopId: { [Op.in]: workshopIds } },
        transaction,
      });
      await Workshop.destroy({
        where: { id: { [Op.in]: workshopIds } },
        transaction,
      });
    }

    // --- resources and enrolments -------------------------------------
    removed.resources = await LearningResource.destroy({
      where: { courseId: course.id },
      transaction,
    });

    removed.enrollments = await CourseEnrollment.destroy({
      where: { courseId: course.id },
      transaction,
    });

    await course.destroy({ transaction });

    await transaction.commit();

    successResponse(res, { deleted: true, removed });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

const reorderCourses = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const order = Array.isArray(req.body.courseUuids)
      ? req.body.courseUuids
      : [];

    for (const [index, uuid] of order.entries()) {
      await Course.update(
        { position: index },
        {
          where: { uuid, cohortProgramId: programme.id },
          transaction,
        },
      );
    }

    await transaction.commit();

    successResponse(res, { reordered: order.length });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

// ------------------------------------------------------------- enrolment

// A startup enrolling itself, where the course allows it.
const enroll = async (req, res) => {
  try {
    const course = await Course.findOne({
      where: { uuid: req.params.courseUuid },
    });

    if (!course || course.archivedAt || course.status !== "published") {
      return res
        .status(404)
        .json({ status: false, message: "Course not found" });
    }

    const mine = await myEnterprise(req.user.id);

    if (!mine || !mine.cohortProgramIds.includes(course.cohortProgramId)) {
      return res
        .status(403)
        .json({ status: false, message: "This course is not open to you" });
    }

    if (!course.selfEnroll) {
      return res.status(403).json({
        status: false,
        message: "Staff enrol startups on this course",
      });
    }

    const [record, created] = await CourseEnrollment.findOrCreate({
      where: { courseId: course.id, businessId: mine.business.id },
      defaults: {
        courseId: course.id,
        cohortProgramId: course.cohortProgramId,
        businessId: mine.business.id,
        userId: req.user.id,
        enrolledAt: new Date(),
      },
    });

    successResponse(res, { enrolled: true, alreadyEnrolled: !created, uuid: record.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Staff putting startups on a course, or taking them off it.
const setEnrollments = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const course = await Course.findOne({
      where: { uuid: req.params.courseUuid },
    });

    if (!course) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Course not found" });
    }

    const wanted = Array.isArray(req.body.businessUuids)
      ? req.body.businessUuids
      : [];

    // Only startups on this course's programme may be enrolled on it.
    const memberships = await CohortMembership.findAll({
      attributes: ["businessId"],
      where: { cohortProgramId: course.cohortProgramId },
      raw: true,
      transaction,
    });

    const eligible = new Set(memberships.map((row) => row.businessId));

    const businesses = wanted.length
      ? await Business.findAll({
          attributes: ["id", "userId", "uuid"],
          where: { uuid: { [Op.in]: wanted } },
          raw: true,
          transaction,
        })
      : [];

    const keep = businesses.filter((row) => eligible.has(row.id));

    for (const business of keep) {
      await CourseEnrollment.findOrCreate({
        where: { courseId: course.id, businessId: business.id },
        defaults: {
          courseId: course.id,
          cohortProgramId: course.cohortProgramId,
          businessId: business.id,
          userId: business.userId,
          enrolledAt: new Date(),
        },
        transaction,
      });
    }

    // Anyone left out comes off the course. Their progress against its
    // the course content is untouched — only the enrolment goes.
    await CourseEnrollment.destroy({
      where: {
        courseId: course.id,
        businessId: {
          [Op.notIn]: keep.length ? keep.map((row) => row.id) : [0],
        },
      },
      transaction,
    });

    await transaction.commit();

    successResponse(res, {
      enrolled: keep.length,
      skipped: businesses.length - keep.length,
    });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

// Who is on this course, and how far they have got. Progress is recomputed
// from progress records on every read, so the stored figure cannot drift.
const getCourseEnrollments = async (req, res) => {
  try {
    const course = await Course.findOne({
      where: { uuid: req.params.courseUuid },
    });

    if (!course) {
      return res
        .status(404)
        .json({ status: false, message: "Course not found" });
    }

    const enrollments = await CourseEnrollment.findAll({
      where: { courseId: course.id },
    });

    const businesses = enrollments.length
      ? await Business.findAll({
          attributes: ["id", "uuid", "name", "email", "userId"],
          where: { id: { [Op.in]: enrollments.map((row) => row.businessId) } },
          order: [["name", "ASC"]],
          raw: true,
        })
      : [];

    const userIds = businesses.map((row) => row.userId).filter(Boolean);
    const { items, byUser } = await courseProgressByUser(course.id, userIds);

    // Workshops on this course that attendance is required for.
    const workshops = await Workshop.findAll({
      attributes: ["id", "attendanceRequired"],
      where: { courseId: course.id },
      raw: true,
    });

    const attendance = workshops.length
      ? await WorkshopAttendance.findAll({
          where: { workshopId: { [Op.in]: workshops.map((row) => row.id) } },
          raw: true,
        })
      : [];

    const requiredWorkshops = workshops.filter((row) => row.attendanceRequired);
    const enrollmentBy = new Map(
      enrollments.map((row) => [row.businessId, row]),
    );

    const now = new Date();
    const data = [];

    for (const business of businesses) {
      const record = enrollmentBy.get(business.id);
      const progress = byUser.get(business.userId) || {
        total: items,
        completed: 0,
        percent: 0,
      };

      const attended = attendance.filter(
        (row) =>
          row.businessId === business.id &&
          ["present", "late"].includes(row.status),
      );

      const requiredAttended = requiredWorkshops.filter((workshop) =>
        attended.some((row) => row.workshopId === workshop.id),
      ).length;

      const finished =
        items > 0 &&
        progress.completed === items &&
        requiredAttended === requiredWorkshops.length;

      let status = "not_started";

      if (record?.status === "archived") {
        status = "archived";
      } else if (finished) {
        status = "completed";
      } else if (progress.percent > 0 || attended.length > 0) {
        status =
          record?.dueAt && new Date(record.dueAt) < now
            ? "overdue"
            : "in_progress";
      } else if (record?.dueAt && new Date(record.dueAt) < now) {
        status = "overdue";
      }

      if (record) {
        const changes = { progressPercent: progress.percent, status };

        if (!record.startedAt && (progress.percent > 0 || attended.length)) {
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
        itemsTotal: progress.total,
        itemsCompleted: progress.completed,
        workshopsAttended: attended.length,
        requiredWorkshops: requiredWorkshops.length,
        progressPercent: progress.percent,
        status,
      });
    }

    // Startups on the programme who are not on this course yet, so staff can
    // add them without leaving the page.
    const memberships = await CohortMembership.findAll({
      attributes: ["businessId"],
      where: { cohortProgramId: course.cohortProgramId },
      raw: true,
    });

    const enrolledIds = new Set(enrollments.map((row) => row.businessId));

    const availableIds = memberships
      .map((row) => row.businessId)
      .filter((id) => !enrolledIds.has(id));

    const available = availableIds.length
      ? await Business.findAll({
          attributes: ["uuid", "name", "email"],
          where: { id: { [Op.in]: availableIds } },
          order: [["name", "ASC"]],
          raw: true,
        })
      : [];

    const averaged = data.length
      ? Math.round(
          data.reduce((sum, row) => sum + row.progressPercent, 0) / data.length,
        )
      : null;

    successResponse(res, {
      course: shapeCourse(course),
      contentItems: items,
      requiredWorkshops: requiredWorkshops.length,
      learners: data.length,
      averageProgress: averaged,
      completed: data.filter((row) => row.status === "completed").length,
      notStarted: data.filter((row) => row.status === "not_started").length,
      data,
      available,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  getCourses,
  getNewCourseCount,
  getCourse,
  createCourse,
  updateCourse,
  archiveCourse,
  deleteCourse,
  reorderCourses,
  enroll,
  setEnrollments,
  getCourseEnrollments,
};
