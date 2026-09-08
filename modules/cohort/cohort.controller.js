const { errorResponse, successResponse } = require("../../utils/responses");
const {
  CohortProgram,
  CohortMembership,
  Business,
  BusinessSector,
  User,
  TrackerSession,
  TrackerEnterprise,
  Milestone,
  CratAssessment,
  CratScoreSnapshot,
  Program,
  Module,
  Slide,
  SlideReader,
  Quiz,
  QuizAttempt,
  sequelize,
} = require("../../models");
const { Op, fn, col } = require("sequelize");

// Slides read per (startup, module) across a programme's modules. Progress is
// measured on SlideReader rows, which the slide viewer already writes, so it
// reflects what learners actually opened rather than a separate flag.
const moduleSlideStats = async (cohortProgramId, userIds = []) => {
  const modules = await Module.findAll({
    attributes: ["id", "uuid", "title", "image", "description", "createdAt"],
    where: { cohortProgramId },
    order: [["createdAt", "ASC"]],
    raw: true,
  });

  const moduleIds = modules.map((row) => row.id);

  const slides = moduleIds.length
    ? await Slide.findAll({
        attributes: ["id", "moduleId"],
        where: { moduleId: { [Op.in]: moduleIds } },
        raw: true,
      })
    : [];

  const slidesByModule = new Map();
  const moduleBySlide = new Map();

  for (const slide of slides) {
    moduleBySlide.set(slide.id, slide.moduleId);
    slidesByModule.set(
      slide.moduleId,
      (slidesByModule.get(slide.moduleId) || 0) + 1,
    );
  }

  const reads =
    slides.length && userIds.length
      ? await SlideReader.findAll({
          attributes: ["userId", "slideId"],
          where: {
            slideId: { [Op.in]: slides.map((row) => row.id) },
            userId: { [Op.in]: userIds },
          },
          raw: true,
        })
      : [];

  // A slide read twice is still one slide read.
  const seen = new Set();
  const readsBy = new Map();

  for (const read of reads) {
    const slideKey = `${read.userId}:${read.slideId}`;
    if (seen.has(slideKey)) continue;
    seen.add(slideKey);

    const key = `${read.userId}:${moduleBySlide.get(read.slideId)}`;
    readsBy.set(key, (readsBy.get(key) || 0) + 1);
  }

  return { modules, slidesByModule, readsBy };
};

// How many of the programme's modules each startup has finished. A module is
// finished once every slide in it has been read.
const moduleCompletionsByUser = async (cohortProgramId, userIds = []) => {
  const { modules, slidesByModule, readsBy } = await moduleSlideStats(
    cohortProgramId,
    userIds,
  );

  const completedByUser = new Map();

  for (const userId of userIds) {
    let completed = 0;

    for (const module of modules) {
      const total = slidesByModule.get(module.id) || 0;
      if (total > 0 && (readsBy.get(`${userId}:${module.id}`) || 0) >= total) {
        completed += 1;
      }
    }

    completedByUser.set(userId, completed);
  }

  return { total: modules.length, completedByUser };
};

// Stands in for a programme uuid to mean "startups not in any programme".
// Programmes use real uuids, so this cannot collide.
const UNASSIGNED_KEY = "unassigned";

// How many startups are in no programme, for the Unassigned tally.
//
// Counted the same way the Unassigned roster is listed, so the badge and the
// list it opens can never disagree:
//
//   - a business whose owner no longer exists is not a startup. Businesses
//     .userId has no foreign key, so deleting a user leaves its business
//     behind; there are hundreds of those, and none of them appear on the
//     Startups list. Requiring the User join drops them.
//   - subtracting the membership count would also be wrong even without the
//     orphans, because some of those memberships belong to businesses that
//     are themselves orphaned, so the totals are drawn from different sets.
const countUnassigned = async () => {
  const assigned = await CohortMembership.findAll({
    attributes: ["businessId"],
    raw: true,
  });
  const assignedIds = assigned.map((row) => row.businessId);

  return Business.count({
    include: [{ model: User, required: true, attributes: [] }],
    where: assignedIds.length ? { id: { [Op.notIn]: assignedIds } } : {},
  });
};

// The programme grid: every cohort with its roster size, plus how many
// startups are not in one.
const getCohortPrograms = async (req, res) => {
  try {
    const programs = await CohortProgram.findAll({
      order: [["title", "ASC"]],
    });

    // Counted through Business and User so a programme card shows the same
    // number as its roster. A membership whose business has been deleted, or
    // whose business outlived its owner, is not a startup on the roster and
    // must not be counted as one here either.
    const tallies = await CohortMembership.findAll({
      attributes: [
        "cohortProgramId",
        [fn("COUNT", col("CohortMembership.id")), "startupCount"],
      ],
      include: [
        {
          model: Business,
          required: true,
          attributes: [],
          include: [{ model: User, required: true, attributes: [] }],
        },
      ],
      group: ["cohortProgramId"],
      raw: true,
    });

    const countByProgramId = new Map(
      tallies.map((row) => [row.cohortProgramId, Number(row.startupCount) || 0]),
    );

    const data = programs.map((program) => ({
      ...program.toJSON(),
      startupCount: countByProgramId.get(program.id) || 0,
    }));

    successResponse(res, {
      count: data.length,
      data,
      unassignedCount: await countUnassigned(),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Public list for the sign-up form, which renders before an account exists.
// Deliberately minimal: uuid and title only.
const getPublicCohortPrograms = async (req, res) => {
  try {
    const programs = await CohortProgram.findAll({
      attributes: ["uuid", "title"],
      order: [["title", "ASC"]],
    });

    successResponse(res, programs);
  } catch (error) {
    errorResponse(res, error);
  }
};

const validateDates = (startDate, endDate) =>
  startDate && endDate && new Date(startDate) > new Date(endDate);

const createCohortProgram = async (req, res) => {
  try {
    const { title, description, image, category, startDate, endDate } =
      req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        status: false,
        message: "Program name is required",
      });
    }

    if (validateDates(startDate, endDate)) {
      return res.status(400).json({
        status: false,
        message: "Program start date cannot be after end date",
      });
    }

    const program = await CohortProgram.create({
      title: String(title).trim(),
      description: description || null,
      image: image || null,
      category: category || null,
      startDate: startDate || null,
      endDate: endDate || null,
    });

    successResponse(res, program);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateCohortProgram = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid },
    });

    if (!program) {
      return res.status(404).json({
        status: false,
        message: "Program not found",
      });
    }

    const { title, description, image, category, startDate, endDate } =
      req.body;

    const startsAt = startDate === undefined ? program.startDate : startDate;
    const endsAt = endDate === undefined ? program.endDate : endDate;

    if (validateDates(startsAt, endsAt)) {
      return res.status(400).json({
        status: false,
        message: "Program start date cannot be after end date",
      });
    }

    // Only the fields the editor owns; nothing else off the body is trusted.
    const payload = {};
    if (title !== undefined) payload.title = String(title).trim();
    if (description !== undefined) payload.description = description;
    if (image !== undefined) payload.image = image;
    if (category !== undefined) payload.category = category;
    if (startDate !== undefined) payload.startDate = startDate || null;
    if (endDate !== undefined) payload.endDate = endDate || null;

    await program.update(payload);

    successResponse(res, program);
  } catch (error) {
    errorResponse(res, error);
  }
};

// Deleting a programme releases its startups (the membership rows cascade).
// The startups themselves are never touched, and nothing in the trackers or
// Class Rooms is reachable from here.
const deleteCohortProgram = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid },
    });

    if (!program) {
      return res.status(404).json({
        status: false,
        message: "Program not found",
      });
    }

    const released = await CohortMembership.count({
      where: { cohortProgramId: program.id },
    });

    await program.destroy();

    successResponse(res, {
      message: "Program deleted",
      releasedStartups: released,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// The startups in one programme, or — with UNASSIGNED_KEY — those in none.
const getCohortStartups = async (req, res) => {
  try {
    const { uuid } = req.params;
    const keyword = String(req.query.keyword || "").trim();

    let program = null;
    let where = {};

    if (uuid === UNASSIGNED_KEY) {
      const assigned = await CohortMembership.findAll({
        attributes: ["businessId"],
        raw: true,
      });
      const assignedIds = assigned.map((row) => row.businessId);
      where = assignedIds.length ? { id: { [Op.notIn]: assignedIds } } : {};
    } else {
      program = await CohortProgram.findOne({ where: { uuid } });

      if (!program) {
        return res.status(404).json({
          status: false,
          message: "Program not found",
        });
      }

      const members = await CohortMembership.findAll({
        attributes: ["businessId"],
        where: { cohortProgramId: program.id },
        raw: true,
      });
      const memberIds = members.map((row) => row.businessId);

      // No members means an empty roster, not "every startup".
      where = { id: { [Op.in]: memberIds.length ? memberIds : [0] } };
    }

    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { email: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const startups = await Business.findAll({
      where,
      include: [
        { model: BusinessSector, required: false },
        {
          // Required: a business whose owner has been deleted is not a startup
          // anyone can act on, and showing it would put rows with no owner on
          // the roster. This also keeps the list in step with countUnassigned.
          model: User,
          required: true,
          attributes: ["uuid", "name", "email", "phone", "image", "role"],
        },
      ],
      order: [["name", "ASC"]],
    });

    // Attach where each startup stands, so the roster can show and change it.
    const memberships = await CohortMembership.findAll({
      // createdAt is when the startup joined the programme — the Enrollment
      // Date on the members table.
      attributes: ["businessId", "status", "reportingStatus", "createdAt"],
      where: { businessId: { [Op.in]: startups.map((item) => item.id) } },
      raw: true,
    });

    const membershipBy = new Map(
      memberships.map((row) => [row.businessId, row]),
    );

    // Milestone tallies drive the Progress and Milestones columns. Counted in
    // one grouped query rather than per startup.
    const businessIds = startups.map((item) => item.id);

    const milestoneRows = businessIds.length
      ? await Milestone.findAll({
          attributes: [
            "businessId",
            "status",
            [fn("COUNT", col("id")), "n"],
          ],
          where: { businessId: { [Op.in]: businessIds } },
          group: ["businessId", "status"],
          raw: true,
        })
      : [];

    const milestonesBy = new Map();
    for (const row of milestoneRows) {
      const entry = milestonesBy.get(row.businessId) || {
        total: 0,
        completed: 0,
      };
      const n = Number(row.n) || 0;
      entry.total += n;
      if (row.status === "completed") entry.completed += n;
      milestonesBy.set(row.businessId, entry);
    }

    // Capital readiness is the overall percentage from the startup's most
    // recent CRAT score snapshot. Only published assessments count — a draft
    // or in-review score is not a result anyone should act on.
    const assessments = businessIds.length
      ? await CratAssessment.findAll({
          attributes: ["id", "business_id"],
          where: { business_id: { [Op.in]: businessIds }, status: "published" },
          raw: true,
        })
      : [];

    const businessByAssessment = new Map(
      assessments.map((row) => [row.id, row.business_id]),
    );

    const snapshots = assessments.length
      ? await CratScoreSnapshot.findAll({
          attributes: ["assessment_id", "overall_percent", "generated_at"],
          where: {
            assessment_id: { [Op.in]: assessments.map((row) => row.id) },
          },
          order: [["generated_at", "DESC"]],
          raw: true,
        })
      : [];

    // Ordered newest first, so the first snapshot seen for a business wins.
    const cratByBusinessId = new Map();
    for (const row of snapshots) {
      const businessId = businessByAssessment.get(row.assessment_id);
      if (businessId === undefined || cratByBusinessId.has(businessId)) continue;
      const percent = Number(row.overall_percent);
      if (Number.isFinite(percent)) {
        cratByBusinessId.set(businessId, Math.round(percent));
      }
    }

    // Modules created for this programme, and how many each startup has
    // finished. The denominator is the same for every row — it is the
    // programme's curriculum, not a per-startup list. A module counts as
    // finished once the startup has read every slide in it.
    const moduleProgress = program
      ? await moduleCompletionsByUser(
          program.id,
          startups.map((item) => item.userId).filter(Boolean),
        )
      : { total: 0, completedByUser: new Map() };

    const data = startups.map((startup) => {
      const milestones = milestonesBy.get(startup.id) || {
        total: 0,
        completed: 0,
      };

      const membership = membershipBy.get(startup.id) || {};

      // Revenue growth is derived, never stored, so it cannot contradict the
      // two revenue figures it comes from. Null when there is no prior
      // quarter to compare against, or when that quarter was zero.
      const current = Number(startup.revenue);
      const previous = Number(startup.previousQuarterRevenue);
      const revenueGrowthPercent =
        Number.isFinite(current) && Number.isFinite(previous) && previous > 0
          ? Math.round(((current - previous) / previous) * 100)
          : null;

      return {
        ...startup.toJSON(),
        membershipStatus: membership.status || null,
        reportingStatus: membership.reportingStatus || null,
        enrolledAt: membership.createdAt || null,
        milestonesTotal: milestones.total,
        milestonesCompleted: milestones.completed,
        revenueGrowthPercent,
        // Null when the startup has no published CRAT assessment yet.
        capitalReadinessPercent: cratByBusinessId.has(startup.id)
          ? cratByBusinessId.get(startup.id)
          : null,
        modulesTotal: moduleProgress.total,
        modulesCompleted:
          moduleProgress.completedByUser.get(startup.userId) || 0,
      };
    });

    successResponse(res, { program, data, count: data.length });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Replace a programme's roster with exactly `businessUuids`. Startups left out
// become unassigned; a startup moved here leaves whatever cohort it was in,
// because businessId is unique in cohort_memberships.
const setCohortStartups = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { businessUuids } = req.body;

    if (!Array.isArray(businessUuids)) {
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message: "businessUuids must be an array",
      });
    }

    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid },
      transaction,
    });

    if (!program) {
      await transaction.rollback();
      return res.status(404).json({
        status: false,
        message: "Program not found",
      });
    }

    const wanted = businessUuids.filter(Boolean);

    const businesses = wanted.length
      ? await Business.findAll({
          where: { uuid: { [Op.in]: wanted } },
          attributes: ["id", "uuid"],
          transaction,
        })
      : [];

    if (businesses.length !== wanted.length) {
      const found = new Set(businesses.map((item) => item.uuid));
      await transaction.rollback();
      return res.status(404).json({
        status: false,
        message: `Unknown startup(s): ${wanted
          .filter((item) => !found.has(item))
          .join(", ")}`,
      });
    }

    const keepIds = businesses.map((item) => item.id);

    // Everyone currently here who is not in the new roster is released.
    await CohortMembership.destroy({
      where: {
        cohortProgramId: program.id,
        ...(keepIds.length ? { businessId: { [Op.notIn]: keepIds } } : {}),
      },
      transaction,
    });

    if (keepIds.length) {
      // Only this programme's roster is being set. A startup may be on other
      // programmes at the same time, so those memberships are left alone —
      // clearing them here would silently drop it from cohorts this screen
      // never mentioned.
      const existing = await CohortMembership.findAll({
        where: { cohortProgramId: program.id, businessId: { [Op.in]: keepIds } },
        attributes: ["businessId"],
        transaction,
        raw: true,
      });
      const alreadyHere = new Set(existing.map((row) => row.businessId));

      // Re-adding someone already on the roster would collide with the unique
      // (cohortProgramId, businessId) index, and would also reset the status
      // and enrollment date they already carry.
      const toAdd = keepIds.filter((businessId) => !alreadyHere.has(businessId));

      if (toAdd.length) {
        await CohortMembership.bulkCreate(
          toAdd.map((businessId) => ({
            cohortProgramId: program.id,
            businessId,
          })),
          { transaction },
        );
      }
    }

    await transaction.commit();

    successResponse(res, {
      programUuid: program.uuid,
      assigned: keepIds.length,
    });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

// Per-programme dashboard: how the roster is split, and how far the programme
// has got overall.
const getCohortDashboard = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid },
    });

    if (!program) {
      return res.status(404).json({
        status: false,
        message: "Program not found",
      });
    }

    const tallies = await CohortMembership.findAll({
      attributes: ["status", [fn("COUNT", col("id")), "n"]],
      where: { cohortProgramId: program.id },
      group: ["status"],
      raw: true,
    });

    const counts = CohortMembership.STATUSES.reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {},
    );

    for (const row of tallies) {
      // Guard against any legacy value not in the current list.
      if (counts[row.status] === undefined) counts[row.status] = 0;
      counts[row.status] = Number(row.n) || 0;
    }

    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

    // Portfolio totals across the programme's startups. Summed over the
    // roster, so a startup counts once no matter how it is doing.
    const members = await CohortMembership.findAll({
      attributes: ["businessId", "status"],
      where: { cohortProgramId: program.id },
      raw: true,
    });

    const memberIds = members.map((row) => row.businessId);

    // Progress is measured on milestones now that "completed" is no longer a
    // membership status. Startups that dropped out are left out, so leaving
    // does not drag the programme's progress down.
    const activeIds = members
      .filter((row) => row.status !== "dropped_out")
      .map((row) => row.businessId);

    const milestoneRows = activeIds.length
      ? await Milestone.findAll({
          attributes: ["status", [fn("COUNT", col("id")), "n"]],
          where: { businessId: { [Op.in]: activeIds } },
          group: ["status"],
          raw: true,
        })
      : [];

    let milestonesTotal = 0;
    let milestonesCompleted = 0;
    for (const row of milestoneRows) {
      const n = Number(row.n) || 0;
      milestonesTotal += n;
      if (row.status === "completed") milestonesCompleted += n;
    }

    const progressPercent =
      milestonesTotal > 0
        ? Math.round((milestonesCompleted / milestonesTotal) * 100)
        : 0;

    const businesses = memberIds.length
      ? await Business.findAll({
          attributes: [
            "jobsCreated",
            "capitalRaised",
            "revenue",
            "previousQuarterRevenue",
          ],
          where: { id: { [Op.in]: memberIds } },
          raw: true,
        })
      : [];

    const sum = (field) =>
      businesses.reduce((acc, row) => {
        const n = Number(row[field]);
        return acc + (Number.isFinite(n) ? n : 0);
      }, 0);

    const jobsCreated = sum("jobsCreated");
    const capitalMobilised = sum("capitalRaised");

    // Programme-level growth compares the totals, not an average of per-startup
    // percentages — a small startup doubling should not outweigh a large one.
    // Only startups with a prior quarter on record are counted, so a missing
    // figure cannot look like a collapse to zero.
    const comparable = businesses.filter(
      (row) => Number(row.previousQuarterRevenue) > 0,
    );

    const currentTotal = comparable.reduce(
      (acc, row) => acc + (Number(row.revenue) || 0),
      0,
    );
    const previousTotal = comparable.reduce(
      (acc, row) => acc + (Number(row.previousQuarterRevenue) || 0),
      0,
    );

    const revenueGrowthPercent =
      previousTotal > 0
        ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
        : null;

    successResponse(res, {
      program,
      totals: {
        total,
        active: counts.active || 0,
        droppedOut: counts.dropped_out || 0,
        jobsCreated,
        capitalMobilised,
      },
      revenueGrowthPercent,
      revenueGrowthBasis: `${comparable.length} of ${businesses.length} startups have a previous quarter on record`,
      progressPercent,
      progressBasis: `${milestonesCompleted} of ${milestonesTotal} milestones completed, excluding dropouts`,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Set where one startup stands in the programme.
const setStartupStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!CohortMembership.STATUSES.includes(status)) {
      return res.status(400).json({
        status: false,
        message: `status must be one of: ${CohortMembership.STATUSES.join(", ")}`,
      });
    }

    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid },
    });

    if (!program) {
      return res.status(404).json({
        status: false,
        message: "Program not found",
      });
    }

    const business = await Business.findOne({
      where: { uuid: req.params.businessUuid },
      attributes: ["id"],
    });

    const membership = business
      ? await CohortMembership.findOne({
          where: { cohortProgramId: program.id, businessId: business.id },
        })
      : null;

    if (!membership) {
      return res.status(404).json({
        status: false,
        message: "That startup is not in this program",
      });
    }

    await membership.update({ status });

    successResponse(res, { businessUuid: req.params.businessUuid, status });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Whether a startup is up to date with its reporting on this programme.
const setReportingStatus = async (req, res) => {
  try {
    const { reportingStatus } = req.body;

    if (!CohortMembership.REPORTING_STATUSES.includes(reportingStatus)) {
      return res.status(400).json({
        status: false,
        message: `reportingStatus must be one of: ${CohortMembership.REPORTING_STATUSES.join(", ")}`,
      });
    }

    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid },
    });

    if (!program) {
      return res.status(404).json({
        status: false,
        message: "Program not found",
      });
    }

    const business = await Business.findOne({
      where: { uuid: req.params.businessUuid },
      attributes: ["id"],
    });

    const membership = business
      ? await CohortMembership.findOne({
          where: { cohortProgramId: program.id, businessId: business.id },
        })
      : null;

    if (!membership) {
      return res.status(404).json({
        status: false,
        message: "That startup is not in this program",
      });
    }

    await membership.update({ reportingStatus });

    successResponse(res, {
      businessUuid: req.params.businessUuid,
      reportingStatus,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// The modules a programme runs, newest last so the curriculum reads in order.
// Courses used to sit between a programme and its modules; they no longer do.
const getCohortModules = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid },
    });

    if (!program) {
      return res.status(404).json({
        status: false,
        message: "Program not found",
      });
    }

    const { modules, slidesByModule } = await moduleSlideStats(program.id);

    const enrolled = await CohortMembership.count({
      where: { cohortProgramId: program.id },
    });

    successResponse(res, {
      program,
      data: modules.map((module) => ({
        ...module,
        slides: slidesByModule.get(module.id) || 0,
      })),
      count: modules.length,
      enrolled,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Programme analytics: summary figures plus a row per module.
//
// Slides, reads and quiz results are real records. Assignments are not
// modelled at all, so assignment pass rate comes back null and the page says
// "No Submissions" rather than inventing a rate.
const getCohortAnalytics = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid },
    });

    if (!program) {
      return res.status(404).json({
        status: false,
        message: "Program not found",
      });
    }

    const memberships = await CohortMembership.findAll({
      attributes: ["businessId", "status"],
      where: { cohortProgramId: program.id },
      raw: true,
    });

    const businessIds = memberships.map((row) => row.businessId);
    const members = businessIds.length;
    const active = memberships.filter((row) => row.status === "active").length;

    const businesses = businessIds.length
      ? await Business.findAll({
          attributes: ["id", "userId"],
          where: { id: { [Op.in]: businessIds } },
          raw: true,
        })
      : [];

    const userIds = businesses.map((row) => row.userId).filter(Boolean);

    const { modules, slidesByModule, readsBy } = await moduleSlideStats(
      program.id,
      userIds,
    );

    const moduleIds = modules.map((row) => row.id);

    // Quiz results per module.
    const quizzes = moduleIds.length
      ? await Quiz.findAll({
          attributes: ["id", "moduleId"],
          where: { moduleId: { [Op.in]: moduleIds } },
          raw: true,
        })
      : [];

    const moduleByQuiz = new Map(quizzes.map((row) => [row.id, row.moduleId]));

    const attempts = quizzes.length
      ? await QuizAttempt.findAll({
          attributes: ["quizId", "score"],
          where: { quizId: { [Op.in]: quizzes.map((row) => row.id) } },
          raw: true,
        })
      : [];

    const quizByModule = new Map();

    for (const row of attempts) {
      const moduleId = moduleByQuiz.get(row.quizId);
      if (moduleId === undefined) continue;
      const entry = quizByModule.get(moduleId) || { attempts: 0, total: 0 };
      entry.attempts += 1;
      entry.total += Number(row.score) || 0;
      quizByModule.set(moduleId, entry);
    }

    let readsTotal = 0;
    let slidesTotal = 0;

    const rows = modules.map((module) => {
      const slides = slidesByModule.get(module.id) || 0;
      const quiz = quizByModule.get(module.id) || { attempts: 0, total: 0 };

      const read = userIds.reduce(
        (sum, userId) => sum + (readsBy.get(`${userId}:${module.id}`) || 0),
        0,
      );

      readsTotal += read;
      slidesTotal += slides * userIds.length;

      const completed = userIds.filter(
        (userId) =>
          slides > 0 && (readsBy.get(`${userId}:${module.id}`) || 0) >= slides,
      ).length;

      return {
        uuid: module.uuid,
        title: module.title,
        lessons: slides,
        completed,
        // Share of the slides in this module the programme's startups have
        // read, averaged over every member.
        averageProgressPercent:
          slides && userIds.length
            ? Math.round((read / (slides * userIds.length)) * 100)
            : 0,
        quizAttempts: quiz.attempts,
        averageQuizScore: quiz.attempts
          ? Math.round(quiz.total / quiz.attempts)
          : null,
        // Not modelled anywhere yet.
        assignmentPassRate: null,
      };
    });

    const totalAttempts = rows.reduce((sum, row) => sum + row.quizAttempts, 0);
    const scored = rows.filter((row) => row.averageQuizScore !== null);

    successResponse(res, {
      program,
      summary: {
        members,
        active,
        modules: rows.length,
        // Programme-wide progress: slides read out of every slide every
        // member could have read.
        averageProgressPercent: slidesTotal
          ? Math.round((readsTotal / slidesTotal) * 100)
          : 0,
        quizAttempts: totalAttempts,
        averageQuizScore: scored.length
          ? Math.round(
              scored.reduce((sum, row) => sum + row.averageQuizScore, 0) /
                scored.length,
            )
          : null,
      },
      data: rows,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Coaching sessions run under a programme. Moved here from the Mentorship
// Tracker so a coach works from the programme's roster; a startup no longer
// has to be in the grant tracker to be coached.
const getCohortSessions = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid },
    });

    if (!program) {
      return res.status(404).json({
        status: false,
        message: "Program not found",
      });
    }

    const sessions = await TrackerSession.findAll({
      where: { cohortProgramId: program.id },
      order: [["sessionDate", "DESC"]],
      include: [
        { model: Business, attributes: ["uuid", "name"] },
        {
          model: User,
          as: "Creator",
          attributes: ["uuid", "name"],
          required: false,
        },
      ],
    });

    successResponse(res, { program, data: sessions, count: sessions.length });
  } catch (error) {
    errorResponse(res, error);
  }
};

const createCohortSession = async (req, res) => {
  try {
    const {
      businessUuid,
      title,
      sessionDate,
      sessionType,
      facilitator,
      issuesDiscussed,
      recommendationsGiven,
      actionsAgreed,
      nextSessionDate,
      flag,
    } = req.body;

    if (!businessUuid || !sessionDate || !sessionType) {
      return res.status(400).json({
        status: false,
        message: "businessUuid, sessionDate and sessionType are required",
      });
    }

    if (nextSessionDate && nextSessionDate < sessionDate) {
      return res.status(400).json({
        status: false,
        message: "The next session cannot be before this one",
      });
    }

    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid },
    });

    if (!program) {
      return res.status(404).json({
        status: false,
        message: "Program not found",
      });
    }

    const business = await Business.findOne({ where: { uuid: businessUuid } });

    // The startup must actually be on this programme's roster.
    const membership = business
      ? await CohortMembership.findOne({
          where: { cohortProgramId: program.id, businessId: business.id },
        })
      : null;

    if (!membership) {
      return res.status(404).json({
        status: false,
        message: "That startup is not in this program",
      });
    }

    // Link the grant-tracker enterprise when there is one, but never require
    // it — that requirement is what kept coaching inside the tracker.
    const enterprise = await TrackerEnterprise.findOne({
      where: { businessId: business.id },
      order: [["createdAt", "DESC"]],
    });

    const session = await TrackerSession.create({
      cohortProgramId: program.id,
      enterpriseId: enterprise ? enterprise.id : null,
      mentorId: req.user.id,
      entreprenuerId: business.userId,
      businessId: business.id,
      createdById: req.user.id,
      title: title || null,
      sessionDate,
      sessionType,
      facilitator: facilitator || null,
      issuesDiscussed: issuesDiscussed || null,
      recommendationsGiven: recommendationsGiven || null,
      actionsAgreed: actionsAgreed || null,
      nextSessionDate: nextSessionDate || null,
      flag: flag || "green",
    });

    successResponse(res, session);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteCohortSession = async (req, res) => {
  try {
    const session = await TrackerSession.findOne({
      where: { uuid: req.params.sessionUuid },
    });

    if (!session) {
      return res.status(404).json({
        status: false,
        message: "Session not found",
      });
    }

    await session.destroy();
    successResponse(res, { message: "Session deleted" });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  UNASSIGNED_KEY,
  getCohortDashboard,
  setStartupStatus,
  setReportingStatus,
  getCohortModules,
  getCohortAnalytics,
  getCohortSessions,
  createCohortSession,
  deleteCohortSession,
  getCohortPrograms,
  getPublicCohortPrograms,
  createCohortProgram,
  updateCohortProgram,
  deleteCohortProgram,
  getCohortStartups,
  setCohortStartups,
};
