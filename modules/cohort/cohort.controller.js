const { errorResponse, successResponse } = require("../../utils/responses");
const {
  CohortProgram,
  CohortProgramLead,
  CohortMembership,
  Notification,
  Business,
  BusinessSector,
  User,
  TrackerSession,
  TrackerEnterprise,
  Milestone,
  MeActivity,
  ProgramDocument,
  ProgramAnnouncement,
  ProgramReport,
  ProgramWorkplanOutput,
  ProgramWorkplanActivity,
  MeEmploymentRecord,
  MeFundingLinkage,
  MeIndicator,
  MeIndicatorValue,
  MeRiskFlag,
  MePeriodicReport,
  ProgramDocumentVersion,
  ProgramDocumentFolder,
  MeActivityAttendance,
  MeEvidence,
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
// Who sees the whole programme grid: Admin and Staff run programme delivery
// across the portfolio, and the M&E Officer monitors all of it. Finance and
// Mentor stay scoped to the programmes they are assigned to lead.
const SEES_ALL_PROGRAMMES = ["Admin", "BDA", "ME"];

// Running a programme's coaching sessions and milestones is a different
// question from seeing it: that stays with Admin and whoever is assigned to
// lead the programme, so a coach cannot act on a programme that is not theirs.
// Every Business Development Advisor works every programme as its lead would;
// being named lead now decides who is notified, not who may act.
const canAccessCohortProgram=async(req,program)=>["Admin","BDA"].includes(req.user.role)||!!(await CohortProgramLead.findOne({where:{cohortProgramId:program.id,userId:req.user.id}}));

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

// The jobs a startup supports, taken from the team size it gives on its
// business information rather than the jobsCreated column — nothing writes
// that column, so reading it reported zero jobs everywhere.
//
// team is free text. Anything that is not a plain number counts as nothing
// rather than being guessed at, so a prose answer cannot invent headcount.
// Shared by the per-startup rows and the programme total so a roster always
// adds up to the figure shown above it.
const jobsOf = (business) => {
  const team = Number(business?.team);
  return Number.isFinite(team) ? team : 0;
};

// Tell the people running a programme that a coaching session was logged on
// one of its startups.
//
// One row per lead, addressed by userId, because that is what the
// notifications bell reads (it matches on userId or on the recipient's role).
// The person who logged the session is skipped — they already know, and being
// notified of your own action reads as a bug.
//
// Never throws: a notification that cannot be written must not undo a coaching
// session that has already been recorded.
const notifyProgramLeads = async (program, business, actor) => {
  try {
    const leads = await CohortProgramLead.findAll({
      where: { cohortProgramId: program.id },
      attributes: ["userId"],
      raw: true,
    });

    const recipients = leads
      .map((row) => row.userId)
      .filter((userId) => userId && userId !== actor.id);

    if (!recipients.length) return;

    const who = actor.name || "A facilitator";

    await Notification.bulkCreate(
      recipients.map((userId) => ({
        userId,
        message: `${who} logged a coaching session for ${business.name} on ${program.title}`,
      })),
    );
  } catch (error) {
    console.error("Failed to notify program leads:", error.message);
  }
};

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
    const visibleWhere={archivedAt:null};
    if(!SEES_ALL_PROGRAMMES.includes(req.user.role)){const leads=await CohortProgramLead.findAll({where:{userId:req.user.id},attributes:["cohortProgramId"],raw:true});visibleWhere.id={ [Op.in]:leads.map(x=>x.cohortProgramId) };}
    const programs = await CohortProgram.findAll({
      where:visibleWhere,
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

// The programmes the signed-in startup is enrolled in.
//
// Answers "am I on a programme, and which?" in one call, which the sidebar
// needs to decide what a startup can reach. Returns every membership, not the
// first — a startup can be on several programmes now.
//
// Anyone without a business simply has none, which is not an error: staff and
// investors hit this through the same shared layout.
const getMyCohortPrograms = async (req, res) => {
  try {
    const business = await Business.findOne({
      where: { userId: req.user.id },
      attributes: ["id", "uuid", "name"],
    });

    if (!business) {
      return successResponse(res, { business: null, data: [], count: 0 });
    }

    const memberships = await CohortMembership.findAll({
      where: { businessId: business.id },
      attributes: ["status", "reportingStatus", "createdAt"],
      include: [
        {
          model: CohortProgram,
          required: true,
          where:{archivedAt:null},
          attributes: ["uuid", "title", "category", "startDate", "endDate"],
        },
      ],
      // Most recently joined first, matching what the learner-facing routes
      // resolve "mine" to when they have to pick one.
      order: [["createdAt", "DESC"]],
    });

    const data = memberships.map((row) => ({
      ...row.CohortProgram.toJSON(),
      membershipStatus: row.status,
      reportingStatus: row.reportingStatus,
      enrolledAt: row.createdAt,
    }));

    successResponse(res, {
      business: { uuid: business.uuid, name: business.name },
      data,
      count: data.length,
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
      where:{archivedAt:null,status:"active"},
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
    const { title, description, image, category, startDate, endDate,parentProgrammeId,recordType,objective,partner,geographicScope,programmeManagerId,reportingFrequency,targetParticipants,status } =
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
    if(recordType==="cohort"){if(!parentProgrammeId)return res.status(400).json({status:false,message:"A cohort must belong to a programme"});const parent=await CohortProgram.findByPk(parentProgrammeId);if(!parent||parent.recordType!=="programme"||parent.archivedAt)return res.status(400).json({status:false,message:"Parent programme is invalid"});}

    const program = await CohortProgram.create({
      title: String(title).trim(),
      description: description || null,
      image: image || null,
      category: category || null,
      startDate: startDate || null,
      endDate: endDate || null,
      parentProgrammeId:parentProgrammeId||null,
      recordType:recordType==="cohort"?"cohort":"programme",
      objective:objective||null,
      partner:partner||null,
      geographicScope:geographicScope||null,
      programmeManagerId:programmeManagerId||null,
      reportingFrequency:reportingFrequency||"quarterly",
      targetParticipants:targetParticipants==null?null:Number(targetParticipants),
      status:status||"active",
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

    const { title, description, image, category, startDate, endDate,parentProgrammeId,recordType,objective,partner,geographicScope,programmeManagerId,reportingFrequency,targetParticipants,status } =
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
    for(const key of ["parentProgrammeId","objective","partner","geographicScope","programmeManagerId","targetParticipants"])if(req.body[key]!==undefined)payload[key]=req.body[key]||null;
    for(const key of ["recordType","reportingFrequency","status"])if(req.body[key]!==undefined&&req.body[key])payload[key]=req.body[key];

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

    const released = await CohortMembership.count({ where: { cohortProgramId: program.id } });
    await program.update({archivedAt:new Date(),status:"archived"});

    successResponse(res, {
      message: "Program archived",
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
        // Overrides the jobsCreated column spread in above, which is empty on
        // every record. The Jobs column on this table reads this field.
        jobsCreated: jobsOf(startup),
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
            "team",
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

    // Summed with the same rule the per-startup Jobs column uses, so the
    // total always equals the roster beneath it.
    const jobsCreated = businesses.reduce(
      (acc, row) => acc + jobsOf(row),
      0,
    );
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
    if(!await canAccessCohortProgram(req,program))return res.status(403).json({status:false,message:"You are not assigned to this program"});

    const sessions = await TrackerSession.findAll({
      where: { cohortProgramId: program.id,...(req.user.role==="Mentor"?{mentorId:req.user.id}:{}) },
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
      durationMinutes,
      mode,
      topic,
      challengeIdentified,
      actionOwner,
      actionDeadline,
      actionStatus,
      notes,
      evidenceUrl,
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
    if(!await canAccessCohortProgram(req,program))return res.status(403).json({status:false,message:"You are not assigned to this program"});

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
    if(req.user.role==="Mentor"&&membership.assignedMentorId!==req.user.id)return res.status(403).json({status:false,message:"You are not assigned to this startup"});

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
      durationMinutes: durationMinutes || null,
      mode: mode || null,
      topic: topic || null,
      challengeIdentified: challengeIdentified || null,
      actionOwner: actionOwner || null,
      actionDeadline: actionDeadline || null,
      actionStatus: actionStatus || "not_started",
      notes: notes || null,
      evidenceUrl: evidenceUrl || null,
    });

    await notifyProgramLeads(program, business, req.user);

    successResponse(res, session);
  } catch (error) {
    errorResponse(res, error);
  }
};

// A programme is run by a Business Development Advisor, and only by one: the
// lead is who the cohort is answerable to. Admin assigns them but does not
// lead programmes itself (it already reaches every programme regardless), and
// Mentor and Finance were removed - they work on a cohort without running it.
//
// This governs both the candidate list and the check on save, so the two
// cannot disagree.
const LEAD_ROLES = ["BDA"];

// The staff running a programme, plus everyone eligible to be added, so the
// picker does not need a second call.
const getCohortLeads = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const [leads, candidates] = await Promise.all([
      CohortProgramLead.findAll({
        where: { cohortProgramId: program.id },
        include: [
          {
            model: User,
            required: true,
            attributes: ["uuid", "name", "email", "role", "image"],
          },
        ],
        order: [["createdAt", "ASC"]],
      }),
      User.findAll({
        where: { role: { [Op.in]: LEAD_ROLES } },
        attributes: ["uuid", "name", "email", "role"],
        order: [["name", "ASC"]],
      }),
    ]);

    successResponse(res, {
      program: { uuid: program.uuid, title: program.title },
      // required: true above drops rows whose user has been deleted, so a
      // stale assignment cannot render as a blank lead.
      data: leads.filter((row) => row.User).map((row) => row.User),
      candidates,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Replace a programme's leads with exactly `userUuids`.
const setCohortLeads = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { userUuids } = req.body;

    if (!Array.isArray(userUuids)) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ status: false, message: "userUuids must be an array" });
    }

    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid },
      transaction,
    });

    if (!program) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const wanted = [...new Set(userUuids.filter(Boolean))];

    const users = wanted.length
      ? await User.findAll({
          where: { uuid: { [Op.in]: wanted }, role: { [Op.in]: LEAD_ROLES } },
          attributes: ["id", "uuid"],
          transaction,
        })
      : [];

    // Naming someone who does not exist, or who cannot lead a programme, is a
    // mistake worth reporting rather than quietly dropping.
    if (users.length !== wanted.length) {
      const found = new Set(users.map((row) => row.uuid));
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message: `Cannot lead a program: ${wanted
          .filter((uuid) => !found.has(uuid))
          .join(", ")}`,
      });
    }

    const keepIds = users.map((row) => row.id);

    await CohortProgramLead.destroy({
      where: {
        cohortProgramId: program.id,
        ...(keepIds.length ? { userId: { [Op.notIn]: keepIds } } : {}),
      },
      transaction,
    });

    // Re-adding an existing lead would collide with the unique index, so only
    // the genuinely new ones are inserted.
    const existing = await CohortProgramLead.findAll({
      where: { cohortProgramId: program.id },
      attributes: ["userId"],
      transaction,
      raw: true,
    });
    const already = new Set(existing.map((row) => row.userId));
    const toAdd = keepIds.filter((userId) => !already.has(userId));

    if (toAdd.length) {
      await CohortProgramLead.bulkCreate(
        toAdd.map((userId) => ({ cohortProgramId: program.id, userId })),
        { transaction },
      );
    }

    await transaction.commit();
    successResponse(res, { programUuid: program.uuid, leads: keepIds.length });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

const deleteCohortSession = async (req, res) => {
  try {
    const program=await CohortProgram.findOne({where:{uuid:req.params.uuid}});
    if(!program)return res.status(404).json({status:false,message:"Program not found"});
    if(!await canAccessCohortProgram(req,program))return res.status(403).json({status:false,message:"You are not assigned to this program"});
    const session = await TrackerSession.findOne({
      where: { uuid: req.params.sessionUuid,cohortProgramId:program.id },
    });

    if (!session) {
      return res.status(404).json({
        status: false,
        message: "Session not found",
      });
    }
    if(req.user.role==="Mentor"&&session.mentorId!==req.user.id)return res.status(403).json({status:false,message:"You can only manage your own sessions"});

    await session.destroy();
    successResponse(res, { message: "Session deleted" });
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateCohortSession=async(req,res)=>{try{const program=await CohortProgram.findOne({where:{uuid:req.params.uuid,archivedAt:null}});if(!program)return res.status(404).json({status:false,message:"Program not found"});if(!await canAccessCohortProgram(req,program))return res.status(403).json({status:false,message:"You are not assigned to this program"});const session=await TrackerSession.findOne({where:{uuid:req.params.sessionUuid,cohortProgramId:program.id}});if(!session)return res.status(404).json({status:false,message:"Session not found"});if(req.user.role==="Mentor"&&session.mentorId!==req.user.id)return res.status(403).json({status:false,message:"You can only update your own sessions"});const fields=["title","sessionDate","sessionType","facilitator","durationMinutes","mode","topic","issuesDiscussed","challengeIdentified","recommendationsGiven","actionsAgreed","actionOwner","actionDeadline","actionStatus","nextSessionDate","notes","evidenceUrl","flag"],payload=Object.fromEntries(fields.filter(k=>req.body[k]!==undefined).map(k=>[k,req.body[k]]));if(payload.actionStatus&&!['not_started','in_progress','completed','overdue','blocked'].includes(payload.actionStatus))return res.status(400).json({status:false,message:"Invalid action status"});await session.update(payload);successResponse(res,session);}catch(error){errorResponse(res,error);}};

const updateParticipation=async(req,res)=>{try{const program=await CohortProgram.findOne({where:{uuid:req.params.uuid,archivedAt:null}}),business=await Business.findOne({where:{uuid:req.params.businessUuid}});if(!program||!business)return res.status(404).json({status:false,message:"Programme participation not found"});const membership=await CohortMembership.findOne({where:{cohortProgramId:program.id,businessId:business.id}});if(!membership)return res.status(404).json({status:false,message:"Programme participation not found"});const fields=["enrollmentDate","completionStatus","completionDate","assignedMentorId","assignedAdvisorId","baselineCompleted","endlineCompleted","attendanceRate","participationNotes"],payload=Object.fromEntries(fields.filter(k=>req.body[k]!==undefined).map(k=>[k,req.body[k]]));if(payload.attendanceRate!==undefined&&(Number(payload.attendanceRate)<0||Number(payload.attendanceRate)>100))return res.status(400).json({status:false,message:"Attendance rate must be between 0 and 100"});if(payload.assignedMentorId&&!await User.findOne({where:{id:payload.assignedMentorId,role:"Mentor"}}))return res.status(400).json({status:false,message:"Assigned mentor is invalid"});if(payload.assignedAdvisorId&&!await User.findOne({where:{id:payload.assignedAdvisorId,role:{[Op.in]:["BDA"]}}}))return res.status(400).json({status:false,message:"Assigned advisor is invalid"});await membership.update(payload);successResponse(res,membership);}catch(error){errorResponse(res,error);}};


// ------------------------------------------------------------------ calendar
//
// The programme implementation calendar: the workplan turned into dated work.
// It carries every kind of activity a programme runs - workshops, mentoring
// sessions, site visits, investor events, reporting deadlines, grant
// milestones, partner meetings - so a lead reads one schedule rather than
// four screens.
//
// Rows live in me_activities, which already holds attendance and is what
// MeEvidence points at, so evidence uploaded against an activity shows here
// without a second link.
//
// Access is canAccessCohortProgram: Admin, or the Business Development
// Advisor assigned to lead this programme.

const CALENDAR_FIELDS = [
  "name",
  "activityType",
  "activityDate",
  "dueDate",
  "location",
  "facilitator",
  "plannedParticipants",
  "actualParticipants",
  "durationMinutes",
  "budgetPlanned",
  "cost",
  "deliverables",
  "learningObjective",
  "report",
  "status",
];

const pickCalendar = (body) =>
  Object.fromEntries(
    CALENDAR_FIELDS.filter((key) => body[key] !== undefined).map((key) => [
      key,
      body[key] === "" ? null : body[key],
    ]),
  );

// An activity is overdue when the date it was due by has passed and nobody has
// marked it done. Derived rather than stored, so it cannot go stale in the
// table while a scheduler is not running.
const withDerived = (row, evidenceByActivity) => {
  const data = row.toJSON ? row.toJSON() : row;
  const due = data.dueDate || data.activityDate;
  const open = !["completed", "cancelled"].includes(data.status);

  return {
    ...data,
    overdue: open && due ? new Date(due) < new Date() : false,
    participants: (data.attendance || []).length,
    evidenceCount: evidenceByActivity.get(data.uuid) || 0,
  };
};

const getCohortCalendar = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    if (!(await canAccessCohortProgram(req, program))) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    const where = { cohortProgramId: program.id };
    if (req.query.activityType) where.activityType = req.query.activityType;
    if (req.query.status) where.status = req.query.status;

    const rows = await MeActivity.findAll({
      where,
      include: [
        { model: User, as: "owner", attributes: ["uuid", "name", "email", "role"] },
        { model: MeActivityAttendance, as: "attendance", attributes: ["uuid", "businessId", "attended"] },
      ],
      order: [["activityDate", "ASC"]],
    });

    // Evidence is filed against the activity uuid, so it is counted in one
    // query rather than per row.
    const evidence = rows.length
      ? await MeEvidence.findAll({
          where: {
            cohortProgramId: program.id,
            entityType: "activity",
            entityUuid: { [Op.in]: rows.map((row) => row.uuid) },
          },
          attributes: ["entityUuid"],
          raw: true,
        })
      : [];

    const evidenceByActivity = new Map();
    for (const row of evidence) {
      evidenceByActivity.set(
        row.entityUuid,
        (evidenceByActivity.get(row.entityUuid) || 0) + 1,
      );
    }

    const data = rows.map((row) => withDerived(row, evidenceByActivity));

    // The figures a lead checks first: what is late, what is coming, and how
    // the budget is tracking against it.
    const summary = {
      total: data.length,
      completed: data.filter((row) => row.status === "completed").length,
      overdue: data.filter((row) => row.overdue).length,
      upcoming: data.filter(
        (row) =>
          !row.overdue &&
          !["completed", "cancelled"].includes(row.status) &&
          new Date(row.dueDate || row.activityDate) >= new Date(),
      ).length,
      budgetPlanned: data.reduce((sum, row) => sum + Number(row.budgetPlanned || 0), 0),
      budgetSpent: data.reduce((sum, row) => sum + Number(row.cost || 0), 0),
    };

    // Everyone who can own a piece of work on this programme.
    const owners = await User.findAll({
      where: { role: { [Op.in]: ["Admin", "BDA", "Mentor", "Finance", "ME"] } },
      attributes: ["uuid", "name", "email", "role"],
      order: [["name", "ASC"]],
    });

    successResponse(res, {
      program: { uuid: program.uuid, title: program.title },
      types: MeActivity.TYPES,
      statuses: MeActivity.STATUSES,
      owners,
      summary,
      count: data.length,
      data,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Create or update one entry. The uuid in the path picks the programme; a
// recordUuid in the path means an edit.
const saveCohortCalendarEntry = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    if (!(await canAccessCohortProgram(req, program))) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    const payload = pickCalendar(req.body);

    if (payload.activityType && !MeActivity.TYPES.includes(payload.activityType)) {
      return res.status(400).json({
        status: false,
        message: "Activity type must be one of " + MeActivity.TYPES.join(", "),
      });
    }

    if (payload.status && !MeActivity.STATUSES.includes(payload.status)) {
      return res.status(400).json({
        status: false,
        message: "Status must be one of " + MeActivity.STATUSES.join(", "),
      });
    }

    // The owner arrives as a user uuid; the column holds the id.
    if (req.body.ownerUuid !== undefined) {
      if (!req.body.ownerUuid) {
        payload.ownerId = null;
      } else {
        const owner = await User.findOne({
          where: { uuid: req.body.ownerUuid },
          attributes: ["id"],
        });

        if (!owner) {
          return res
            .status(400)
            .json({ status: false, message: "That owner does not exist" });
        }

        payload.ownerId = owner.id;
      }
    }

    if (req.params.recordUuid) {
      const record = await MeActivity.findOne({
        where: { uuid: req.params.recordUuid, cohortProgramId: program.id },
      });

      if (!record) {
        return res
          .status(404)
          .json({ status: false, message: "Calendar entry not found" });
      }

      await record.update(payload);
      return successResponse(res, record);
    }

    if (!String(payload.name || "").trim()) {
      return res
        .status(400)
        .json({ status: false, message: "An activity name is required" });
    }

    if (!payload.activityDate) {
      return res
        .status(400)
        .json({ status: false, message: "An activity date is required" });
    }

    const created = await MeActivity.create({
      ...payload,
      activityType: payload.activityType || "other",
      cohortProgramId: program.id,
      createdById: req.user ? req.user.id : null,
    });

    successResponse(res, created);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteCohortCalendarEntry = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    if (!(await canAccessCohortProgram(req, program))) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    const record = await MeActivity.findOne({
      where: { uuid: req.params.recordUuid, cohortProgramId: program.id },
    });

    if (!record) {
      return res
        .status(404)
        .json({ status: false, message: "Calendar entry not found" });
    }

    // Attendance rows hang off the activity and would otherwise be orphaned.
    await MeActivityAttendance.destroy({ where: { activityId: record.id } });
    await record.destroy();

    successResponse(res, { uuid: req.params.recordUuid });
  } catch (error) {
    errorResponse(res, error);
  }
};


// ------------------------------------------------------------------ coaching
//
// Who is coaching whom on this programme, what they agreed to work on, when
// they next meet, and what came out of the last visit.
//
// Nothing here is a new record: assignment lives on the membership and the
// visits are TrackerSessions. This reads both as one roster so a Program Lead
// sees the whole coaching picture without opening each enterprise.

// A coach writes things an enterprise tells them in confidence. On a session
// marked confidential the private notes are held back from everyone but the
// coach who wrote them and Admin - the session, its agreed actions and its RAG
// flag still show, so oversight is never blind, only incurious about the notes.
const canReadPrivateNotes = (req, session) =>
  req.user.role === "Admin" || session.mentorId === req.user.id;

const shapeSession = (req, session) => {
  const data = session.toJSON ? session.toJSON() : session;
  const withheld = data.confidential && !canReadPrivateNotes(req, data);

  return {
    uuid: data.uuid,
    sessionDate: data.sessionDate,
    nextSessionDate: data.nextSessionDate,
    sessionType: data.sessionType,
    topic: data.topic,
    durationMinutes: data.durationMinutes,
    issuesDiscussed: data.issuesDiscussed,
    recommendationsGiven: data.recommendationsGiven,
    actionsAgreed: data.actionsAgreed,
    actionOwner: data.actionOwner,
    actionDeadline: data.actionDeadline,
    actionStatus: data.actionStatus,
    flag: data.flag,
    confidential: !!data.confidential,
    // Never send what the caller may not read, and say so rather than
    // returning an empty field that reads as "no notes were taken".
    notes: withheld ? null : data.notes,
    notesWithheld: withheld,
    mentor: data.Mentor
      ? { uuid: data.Mentor.uuid, name: data.Mentor.name, role: data.Mentor.role }
      : null,
  };
};

const OPEN_ACTION_STATUSES = ["not_started", "in_progress", "overdue", "blocked"];

const getCohortCoaching = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    // Who may read this, and how much of it.
    //
    // Admin and the programme lead see every enterprise. The M&E Officer sees
    // them too - they already hold portfolio-wide M&E access. A coach is
    // never a programme lead, so they are admitted on the strength of the
    // enterprises actually assigned to them, and see only those: without this
    // a mentor could not read or update their own coaching records.
    const oversees =
      (await canAccessCohortProgram(req, program)) || req.user.role === "ME";

    const coachedByMe = oversees
      ? null
      : await CohortMembership.findAll({
          where: {
            cohortProgramId: program.id,
            assignedMentorId: req.user.id,
          },
          attributes: ["id"],
          raw: true,
        });

    if (!oversees && !(coachedByMe || []).length) {
      return res.status(403).json({
        status: false,
        message: "You do not coach anyone on this program",
      });
    }

    const memberships = await CohortMembership.findAll({
      where: {
        cohortProgramId: program.id,
        ...(oversees ? {} : { assignedMentorId: req.user.id }),
      },
      include: [
        { model: Business, required: true, attributes: ["id", "uuid", "name", "location"] },
      ],
    });

    const businessIds = memberships.map((row) => row.businessId);

    const sessions = businessIds.length
      ? await TrackerSession.findAll({
          where: {
            cohortProgramId: program.id,
            businessId: { [Op.in]: businessIds },
          },
          include: [
            { model: User, as: "Mentor", attributes: ["uuid", "name", "role"] },
          ],
          order: [["sessionDate", "DESC"]],
        })
      : [];

    // The people who can be put against an enterprise. Mentors coach; the
    // advisors are the programme's own Business Development Advisors.
    const [mentors, advisors] = await Promise.all([
      User.findAll({
        where: { role: "Mentor" },
        attributes: ["id", "uuid", "name", "email"],
        order: [["name", "ASC"]],
      }),
      User.findAll({
        where: { role: "BDA" },
        attributes: ["id", "uuid", "name", "email"],
        order: [["name", "ASC"]],
      }),
    ]);

    const byId = new Map(
      [...mentors, ...advisors].map((row) => [row.id, row]),
    );

    const now = new Date();

    const data = memberships.map((membership) => {
      const mine = sessions.filter(
        (row) => row.businessId === membership.businessId,
      );

      const shaped = mine.map((row) => shapeSession(req, row));
      const last = shaped[0] || null;

      // The next visit is the soonest future date anyone has set, whether it
      // was entered as a session date or promised as a follow-up.
      const upcoming = mine
        .flatMap((row) => [row.nextSessionDate, row.sessionDate])
        .filter((value) => value && new Date(value) >= now)
        .sort((a, b) => new Date(a) - new Date(b));

      const mentor = byId.get(membership.assignedMentorId);
      const advisor = byId.get(membership.assignedAdvisorId);

      return {
        business: membership.Business,
        membershipUuid: membership.uuid,
        supportAreas: membership.supportAreas || "",
        mentor: mentor ? { uuid: mentor.uuid, name: mentor.name } : null,
        advisor: advisor ? { uuid: advisor.uuid, name: advisor.name } : null,
        sessionCount: shaped.length,
        nextSession: upcoming[0] || null,
        lastSession: last,
        openActions: shaped.filter((row) =>
          OPEN_ACTION_STATUSES.includes(row.actionStatus),
        ).length,
        // The most recent RAG flag a coach set: the progress read.
        flag: last ? last.flag : null,
        sessions: shaped,
      };
    });

    successResponse(res, {
      program: { uuid: program.uuid, title: program.title },
      mentors: mentors.map((row) => ({ uuid: row.uuid, name: row.name, email: row.email })),
      advisors: advisors.map((row) => ({ uuid: row.uuid, name: row.name, email: row.email })),
      summary: {
        enterprises: data.length,
        withMentor: data.filter((row) => row.mentor).length,
        withoutMentor: data.filter((row) => !row.mentor).length,
        openActions: data.reduce((sum, row) => sum + row.openActions, 0),
        atRisk: data.filter((row) => row.flag === "red").length,
      },
      count: data.length,
      data,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Assign the coach and advisor, and record what they agreed to work on.
// Assignment is the Program Lead's call, so this is narrower than reading:
// Admin or the advisor leading this programme, never a coach.
const setCohortCoaching = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    if (!(await canAccessCohortProgram(req, program))) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    if (!["Admin", "BDA"].includes(req.user.role)) {
      return res.status(403).json({
        status: false,
        message: "Only the program lead assigns coaches",
      });
    }

    const business = await Business.findOne({
      where: { uuid: req.params.businessUuid },
    });

    const membership = business
      ? await CohortMembership.findOne({
          where: { cohortProgramId: program.id, businessId: business.id },
        })
      : null;

    if (!membership) {
      return res
        .status(404)
        .json({ status: false, message: "This startup is not on the program" });
    }

    const payload = {};

    if (req.body.supportAreas !== undefined) {
      payload.supportAreas = req.body.supportAreas || null;
    }

    // Both arrive as user uuids and are checked against the role that may
    // hold them, so a mentor cannot be filed as the advisor or the reverse.
    for (const [key, column, role] of [
      ["mentorUuid", "assignedMentorId", "Mentor"],
      ["advisorUuid", "assignedAdvisorId", "BDA"],
    ]) {
      if (req.body[key] === undefined) continue;

      if (!req.body[key]) {
        payload[column] = null;
        continue;
      }

      const person = await User.findOne({
        where: { uuid: req.body[key], role },
        attributes: ["id"],
      });

      if (!person) {
        return res.status(400).json({
          status: false,
          message:
            role === "Mentor"
              ? "That mentor does not exist"
              : "That business development advisor does not exist",
        });
      }

      payload[column] = person.id;
    }

    await membership.update(payload);

    successResponse(res, {
      businessUuid: req.params.businessUuid,
      supportAreas: membership.supportAreas,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};


// ----------------------------------------------------------------- documents
//
// The programme document library: agreements, proposals, participant
// documents, training materials, attendance sheets, photos, reports, invoices,
// due-diligence packs, grant evidence and contracts.
//
// Each document is tagged by programme, and optionally by enterprise,
// activity and reporting period. Every upload against it is a version, and the
// document names which one is authoritative - so "which file is current" is
// answered by the data, not by reading filenames.

const documentsFor = (program, query) => {
  const where = { cohortProgramId: program.id, archivedAt: null };
  if (query.category) where.category = query.category;
  if (query.reportingPeriod) where.reportingPeriod = query.reportingPeriod;
  return where;
};

const shapeDocument = (row) => {
  const data = row.toJSON ? row.toJSON() : row;
  const versions = (data.versions || []).sort(
    (a, b) => b.versionNumber - a.versionNumber,
  );

  return {
    uuid: data.uuid,
    title: data.title,
    description: data.description,
    category: data.category,
    reportingPeriod: data.reportingPeriod,
    // Null means "Unfiled", which the screen says out loud rather than
    // leaving as a blank.
    folder: data.folder
      ? {
          uuid: data.folder.uuid,
          name: data.folder.name,
          colour: data.folder.colour,
        }
      : null,
    business: data.Business
      ? { uuid: data.Business.uuid, name: data.Business.name }
      : null,
    activity: data.activity
      ? { uuid: data.activity.uuid, name: data.activity.name }
      : null,
    uploadedBy: data.uploadedBy ? data.uploadedBy.name : null,
    createdAt: data.createdAt,
    versionCount: versions.length,
    // The authoritative file, called out rather than left to be inferred.
    current: versions.find((row) => row.id === data.currentVersionId) ||
      versions[0] ||
      null,
    versions,
  };
};

const getProgramDocuments = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    // Reading the library is open to the roles that run or report on the
    // programme; writing is narrower, below.
    const oversees =
      (await canAccessCohortProgram(req, program)) ||
      ["ME", "Finance"].includes(req.user.role);

    if (!oversees) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    const where = documentsFor(program, req.query);

    // Tag filters arrive as uuids and are resolved to ids here, so a caller
    // never has to know the numeric keys.
    if (req.query.businessUuid) {
      const business = await Business.findOne({
        where: { uuid: req.query.businessUuid },
        attributes: ["id"],
      });
      where.businessId = business ? business.id : -1;
    }

    if (req.query.activityUuid) {
      const activity = await MeActivity.findOne({
        where: { uuid: req.query.activityUuid },
        attributes: ["id"],
      });
      where.activityId = activity ? activity.id : -1;
    }

    // "none" asks for the unfiled documents, which is a real question a lead
    // asks — what has been dropped in without being put anywhere.
    if (req.query.folderUuid === "none") {
      where.folderId = null;
    } else if (req.query.folderUuid) {
      const folder = await ProgramDocumentFolder.findOne({
        where: { uuid: req.query.folderUuid, cohortProgramId: program.id },
        attributes: ["id"],
      });
      where.folderId = folder ? folder.id : -1;
    }

    const rows = await ProgramDocument.findAll({
      where,
      include: [
        {
          model: ProgramDocumentFolder,
          as: "folder",
          attributes: ["uuid", "name", "colour"],
        },
        { model: Business, attributes: ["uuid", "name"] },
        { model: MeActivity, as: "activity", attributes: ["uuid", "name"] },
        { model: User, as: "uploadedBy", attributes: ["name"] },
        {
          model: ProgramDocumentVersion,
          as: "versions",
          include: [{ model: User, as: "uploadedBy", attributes: ["name"] }],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const data = rows.map(shapeDocument);

    // What the library holds, so a lead can see at a glance whether the
    // programme's paperwork is actually being filed.
    const byCategory = {};
    for (const row of data) {
      byCategory[row.category] = (byCategory[row.category] || 0) + 1;
    }

    // The folders, with how much each holds. Counted over the whole library
    // rather than the filtered view, so opening one folder does not make the
    // others look empty.
    const folders = await ProgramDocumentFolder.findAll({
      where: { cohortProgramId: program.id, archivedAt: null },
      order: [
        ["position", "ASC"],
        ["name", "ASC"],
      ],
    });

    const filed = await ProgramDocument.findAll({
      where: { cohortProgramId: program.id, archivedAt: null },
      attributes: ["folderId"],
      raw: true,
    });

    const perFolder = {};
    let unfiled = 0;

    for (const row of filed) {
      if (row.folderId === null) unfiled += 1;
      else perFolder[row.folderId] = (perFolder[row.folderId] || 0) + 1;
    }

    successResponse(res, {
      program: { uuid: program.uuid, title: program.title },
      categories: ProgramDocument.CATEGORIES,
      colours: ProgramDocumentFolder.COLOURS,
      folders: folders.map((folder) => ({
        uuid: folder.uuid,
        name: folder.name,
        colour: folder.colour,
        position: folder.position,
        documents: perFolder[folder.id] || 0,
      })),
      unfiled,
      canUpload: await canAccessCohortProgram(req, program),
      summary: {
        documents: data.length,
        versions: data.reduce((sum, row) => sum + row.versionCount, 0),
        tagged: data.filter((row) => row.business || row.activity).length,
        byCategory,
      },
      count: data.length,
      data,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Resolve the optional tags from uuids. Returns null when one was given but
// does not exist, so a typo is refused rather than silently filed untagged.
const resolveTags = async (body, program) => {
  const tags = {};

  // An empty folderUuid is meaningful — it moves the document back to
  // Unfiled — so the field is read for presence, not for truthiness.
  if (body.folderUuid !== undefined) {
    if (!body.folderUuid) {
      tags.folderId = null;
    } else {
      const folder = await ProgramDocumentFolder.findOne({
        where: {
          uuid: body.folderUuid,
          cohortProgramId: program.id,
          archivedAt: null,
        },
        attributes: ["id"],
      });
      if (!folder) return null;
      tags.folderId = folder.id;
    }
  }

  if (body.businessUuid) {
    const business = await Business.findOne({
      where: { uuid: body.businessUuid },
      attributes: ["id"],
    });
    if (!business) return null;
    tags.businessId = business.id;
  }

  if (body.activityUuid) {
    const activity = await MeActivity.findOne({
      where: { uuid: body.activityUuid },
      attributes: ["id"],
    });
    if (!activity) return null;
    tags.activityId = activity.id;
  }

  if (body.reportingPeriod !== undefined) {
    tags.reportingPeriod = body.reportingPeriod || null;
  }

  return tags;
};

// Filing a document, and filing a new version of one, are the same act with
// the same rules - so one handler does both. A recordUuid in the path means
// "another version of this"; without it, a new document.
const saveProgramDocument = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
      transaction,
    });

    if (!program) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    // Filing is for the people who run the programme, not everyone who reads
    // it: an M&E Officer or Finance can see the library without adding to it.
    if (!(await canAccessCohortProgram(req, program))) {
      await transaction.rollback();
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    if (!req.file) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ status: false, message: "A file is required" });
    }

    const tags = await resolveTags(req.body, program);

    if (!tags) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ status: false, message: "That folder, enterprise or activity does not exist" });
    }

    let document;

    if (req.params.recordUuid) {
      document = await ProgramDocument.findOne({
        where: { uuid: req.params.recordUuid, cohortProgramId: program.id },
        transaction,
      });

      if (!document) {
        await transaction.rollback();
        return res
          .status(404)
          .json({ status: false, message: "Document not found" });
      }
    } else {
      if (!String(req.body.title || "").trim()) {
        await transaction.rollback();
        return res
          .status(400)
          .json({ status: false, message: "A document title is required" });
      }

      const category = req.body.category || "other";

      if (!ProgramDocument.CATEGORIES.includes(category)) {
        await transaction.rollback();
        return res.status(400).json({
          status: false,
          message:
            "Category must be one of " + ProgramDocument.CATEGORIES.join(", "),
        });
      }

      document = await ProgramDocument.create(
        {
          ...tags,
          cohortProgramId: program.id,
          category,
          title: String(req.body.title).trim(),
          description: req.body.description || null,
          uploadedById: req.user ? req.user.id : null,
        },
        { transaction },
      );
    }

    // Version numbers run 1, 2, 3 in upload order, counted from what is
    // already filed rather than from a column that could drift.
    const previous = await ProgramDocumentVersion.max("versionNumber", {
      where: { documentId: document.id },
      transaction,
    });

    const version = await ProgramDocumentVersion.create(
      {
        documentId: document.id,
        versionNumber: (Number(previous) || 0) + 1,
        fileName: req.file.originalname,
        fileUrl: `/files/${req.file.filename}`,
        storageKey: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        notes: req.body.notes || null,
        uploadedById: req.user ? req.user.id : null,
      },
      { transaction },
    );

    // The newest upload becomes the authoritative one.
    await document.update({ currentVersionId: version.id }, { transaction });

    await transaction.commit();

    successResponse(res, {
      uuid: document.uuid,
      versionNumber: version.versionNumber,
    });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

// Retag or rename. The files are untouched - this is the label, not the
// contents.
const updateProgramDocument = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    if (!(await canAccessCohortProgram(req, program))) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    const document = await ProgramDocument.findOne({
      where: { uuid: req.params.recordUuid, cohortProgramId: program.id },
    });

    if (!document) {
      return res
        .status(404)
        .json({ status: false, message: "Document not found" });
    }

    const tags = await resolveTags(req.body, program);

    if (!tags) {
      return res
        .status(400)
        .json({ status: false, message: "That folder, enterprise or activity does not exist" });
    }

    const payload = { ...tags };

    if (req.body.title !== undefined) {
      if (!String(req.body.title).trim()) {
        return res
          .status(400)
          .json({ status: false, message: "A document title is required" });
      }
      payload.title = String(req.body.title).trim();
    }

    if (req.body.description !== undefined) {
      payload.description = req.body.description || null;
    }

    if (req.body.category !== undefined) {
      if (!ProgramDocument.CATEGORIES.includes(req.body.category)) {
        return res.status(400).json({
          status: false,
          message:
            "Category must be one of " + ProgramDocument.CATEGORIES.join(", "),
        });
      }
      payload.category = req.body.category;
    }

    await document.update(payload);
    successResponse(res, { uuid: document.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Archived, never destroyed: a contract that has been superseded is still the
// record of what was agreed at the time.
const archiveProgramDocument = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    if (!(await canAccessCohortProgram(req, program))) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    const document = await ProgramDocument.findOne({
      where: { uuid: req.params.recordUuid, cohortProgramId: program.id },
    });

    if (!document) {
      return res
        .status(404)
        .json({ status: false, message: "Document not found" });
    }

    await document.update({ archivedAt: new Date() });
    successResponse(res, { uuid: document.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};


// ------------------------------------------------------- document folders
//
// Folders are the programme's own filing, over and above the category tags.
// They are created by whoever runs the programme, named freely, and carry a
// colour so a library of them can be read at a glance.

// The next unused colour, so two folders made in a row never look alike. Once
// the palette is exhausted it wraps — ten distinguishable folders is already
// more than a screen reads comfortably.
const nextColour = (taken) => {
  const free = ProgramDocumentFolder.COLOURS.find(
    (colour) => !taken.includes(colour),
  );
  return (
    free ||
    ProgramDocumentFolder.COLOURS[taken.length % ProgramDocumentFolder.COLOURS.length]
  );
};

// Creating a folder and renaming or recolouring one are the same act with the
// same rules, so one handler does both: a recordUuid in the path means "this
// folder", without it means a new one.
const saveProgramDocumentFolder = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    // Filing structure is for the people who run the programme; M&E and
    // Finance read the library without rearranging it.
    if (!(await canAccessCohortProgram(req, program))) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    if (
      req.body.colour &&
      !ProgramDocumentFolder.COLOURS.includes(req.body.colour)
    ) {
      return res.status(400).json({
        status: false,
        message:
          "Colour must be one of " + ProgramDocumentFolder.COLOURS.join(", "),
      });
    }

    const siblings = await ProgramDocumentFolder.findAll({
      where: { cohortProgramId: program.id, archivedAt: null },
      attributes: ["id", "uuid", "name", "colour"],
      raw: true,
    });

    const name = String(req.body.name || "").trim();

    if (req.params.recordUuid) {
      const folder = await ProgramDocumentFolder.findOne({
        where: {
          uuid: req.params.recordUuid,
          cohortProgramId: program.id,
          archivedAt: null,
        },
      });

      if (!folder) {
        return res
          .status(404)
          .json({ status: false, message: "Folder not found" });
      }

      const payload = {};

      if (req.body.name !== undefined) {
        if (!name) {
          return res
            .status(400)
            .json({ status: false, message: "A folder name is required" });
        }

        const clash = siblings.find(
          (row) =>
            row.uuid !== folder.uuid &&
            row.name.toLowerCase() === name.toLowerCase(),
        );

        if (clash) {
          return res.status(400).json({
            status: false,
            message: `This program already has a folder called "${name}"`,
          });
        }

        payload.name = name;
      }

      if (req.body.colour !== undefined) payload.colour = req.body.colour;
      if (req.body.position !== undefined) {
        payload.position = Number(req.body.position) || 0;
      }

      await folder.update(payload);

      return successResponse(res, {
        uuid: folder.uuid,
        name: folder.name,
        colour: folder.colour,
      });
    }

    if (!name) {
      return res
        .status(400)
        .json({ status: false, message: "A folder name is required" });
    }

    // Two folders with the same name in one library is a filing mistake, not
    // a preference — refuse it rather than let documents scatter between them.
    if (siblings.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({
        status: false,
        message: `This program already has a folder called "${name}"`,
      });
    }

    const folder = await ProgramDocumentFolder.create({
      cohortProgramId: program.id,
      name,
      colour:
        req.body.colour || nextColour(siblings.map((row) => row.colour)),
      position: siblings.length,
      createdById: req.user ? req.user.id : null,
    });

    successResponse(res, {
      uuid: folder.uuid,
      name: folder.name,
      colour: folder.colour,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Removing a folder removes the folder, never the documents: they return to
// Unfiled, where they can be put somewhere else. A folder is a label.
const deleteProgramDocumentFolder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
      transaction,
    });

    if (!program) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    if (!(await canAccessCohortProgram(req, program))) {
      await transaction.rollback();
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    const folder = await ProgramDocumentFolder.findOne({
      where: {
        uuid: req.params.recordUuid,
        cohortProgramId: program.id,
        archivedAt: null,
      },
      transaction,
    });

    if (!folder) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Folder not found" });
    }

    // Set loose explicitly: the folder is archived rather than deleted, so the
    // database's ON DELETE SET NULL never fires for it.
    const [released] = await ProgramDocument.update(
      { folderId: null },
      { where: { folderId: folder.id }, transaction },
    );

    await folder.update({ archivedAt: new Date() }, { transaction });

    await transaction.commit();

    successResponse(res, { uuid: folder.uuid, released });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};


// ------------------------------------------------------------ communications
//
// Outbound: what the programme lead sends its cohort - announcements, workshop
// and milestone reminders, survey and reporting requests.
//
// Inbound: what the system raises for staff - activities past their date,
// milestones waiting on review, participants falling behind, risks escalating.
//
// Both land in Notification, which is what the bell already reads. The send
// itself is recorded in ProgramAnnouncement so a lead can answer "did we
// remind them?" without counting notification rows.

// Who a send reaches. Returns the owning user of each enterprise, since a
// notification is read by a person, not a company.
const recipientsFor = async (program, audience, businessUuids) => {
  const memberships = await CohortMembership.findAll({
    where: { cohortProgramId: program.id },
    attributes: ["businessId"],
    raw: true,
  });

  let businessIds = memberships.map((row) => row.businessId);

  if (audience === "selected") {
    const chosen = await Business.findAll({
      where: { uuid: { [Op.in]: (businessUuids || []).filter(Boolean) } },
      attributes: ["id"],
      raw: true,
    });
    const allowed = new Set(businessIds);
    businessIds = chosen.map((row) => row.id).filter((id) => allowed.has(id));
  }

  if (audience === "behind") {
    // "Behind" is not a guess: an open risk flag, or a reporting period whose
    // due date has passed without being verified.
    const [risky, late] = await Promise.all([
      MeRiskFlag.findAll({
        where: { cohortProgramId: program.id, status: "open" },
        attributes: ["businessId"],
        raw: true,
      }),
      MePeriodicReport.findAll({
        where: {
          cohortProgramId: program.id,
          dueDate: { [Op.lt]: new Date() },
          status: { [Op.in]: ["draft", "submitted", "overdue"] },
        },
        attributes: ["businessId"],
        raw: true,
      }),
    ]);

    const flagged = new Set([
      ...risky.map((row) => row.businessId),
      ...late.map((row) => row.businessId),
    ]);
    businessIds = businessIds.filter((id) => flagged.has(id));
  }

  if (!businessIds.length) return [];

  // A business whose owner account is missing cannot be written to; it is
  // dropped rather than counted as reached.
  const businesses = await Business.findAll({
    where: { id: { [Op.in]: businessIds } },
    attributes: ["id", "userId"],
    raw: true,
  });

  return [...new Set(businesses.map((row) => row.userId).filter(Boolean))];
};

const sendProgramAnnouncement = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
      transaction,
    });

    if (!program) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    if (!(await canAccessCohortProgram(req, program))) {
      await transaction.rollback();
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    const { messageType = "announcement", audience = "cohort" } = req.body;

    if (!ProgramAnnouncement.TYPES.includes(messageType)) {
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message: "Message type must be one of " + ProgramAnnouncement.TYPES.join(", "),
      });
    }

    if (!ProgramAnnouncement.AUDIENCES.includes(audience)) {
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message: "Audience must be one of " + ProgramAnnouncement.AUDIENCES.join(", "),
      });
    }

    if (!String(req.body.subject || "").trim()) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ status: false, message: "A subject is required" });
    }

    if (!String(req.body.body || "").trim()) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ status: false, message: "A message is required" });
    }

    const userIds = await recipientsFor(
      program,
      audience,
      req.body.businessUuids,
    );

    if (!userIds.length) {
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message:
          audience === "behind"
            ? "No enterprise on this program is currently behind"
            : "That selection reaches nobody",
      });
    }

    const subject = String(req.body.subject).trim();

    const announcement = await ProgramAnnouncement.create(
      {
        cohortProgramId: program.id,
        messageType,
        audience,
        subject,
        body: String(req.body.body).trim(),
        recipientCount: userIds.length,
        sentById: req.user ? req.user.id : null,
      },
      { transaction },
    );

    // One notification per recipient - that is what the bell reads.
    await Notification.bulkCreate(
      userIds.map((userId) => ({
        userId,
        to: "Enterprenuer",
        message: `${program.title}: ${subject}`,
      })),
      { transaction },
    );

    await transaction.commit();

    successResponse(res, {
      uuid: announcement.uuid,
      recipientCount: userIds.length,
    });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

const getProgramAnnouncements = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const oversees =
      (await canAccessCohortProgram(req, program)) ||
      ["ME", "Finance"].includes(req.user.role);

    if (!oversees) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    const rows = await ProgramAnnouncement.findAll({
      where: { cohortProgramId: program.id },
      include: [{ model: User, as: "sentBy", attributes: ["name"] }],
      order: [["createdAt", "DESC"]],
      limit: 100,
    });

    successResponse(res, {
      program: { uuid: program.uuid, title: program.title },
      types: ProgramAnnouncement.TYPES,
      audiences: ProgramAnnouncement.AUDIENCES,
      canSend: await canAccessCohortProgram(req, program),
      count: rows.length,
      data: rows.map((row) => {
        const data = row.toJSON();
        return {
          uuid: data.uuid,
          messageType: data.messageType,
          audience: data.audience,
          subject: data.subject,
          body: data.body,
          recipientCount: data.recipientCount,
          sentBy: data.sentBy ? data.sentBy.name : null,
          createdAt: data.createdAt,
        };
      }),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// What the programme needs someone to look at. Read-only: it reports the
// state, and raising it as notifications is a separate, deliberate act.
const programAlerts = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const oversees =
      (await canAccessCohortProgram(req, program)) ||
      ["ME", "Finance"].includes(req.user.role);

    if (!oversees) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    const now = new Date();

    const [overdueActivities, reportsAwaitingReview, behind, risks] =
      await Promise.all([
        // Calendar work whose date has passed and which nobody has closed.
        MeActivity.findAll({
          where: {
            cohortProgramId: program.id,
            status: { [Op.notIn]: ["completed", "cancelled"] },
            [Op.or]: [
              { dueDate: { [Op.lt]: now } },
              { dueDate: null, activityDate: { [Op.lt]: now } },
            ],
          },
          attributes: ["uuid", "name", "activityType", "activityDate", "dueDate"],
          order: [["activityDate", "ASC"]],
        }),

        // Submitted and waiting on a verifier.
        MePeriodicReport.findAll({
          where: { cohortProgramId: program.id, status: "submitted" },
          attributes: ["uuid", "reportingPeriod", "businessId", "dueDate"],
        }),

        // Participants falling behind: a reporting period past its due date.
        MePeriodicReport.findAll({
          where: {
            cohortProgramId: program.id,
            dueDate: { [Op.lt]: now },
            status: { [Op.in]: ["draft", "overdue"] },
          },
          attributes: ["uuid", "reportingPeriod", "businessId", "dueDate"],
        }),

        // Risks a coach or the scanner has raised and nobody has closed.
        MeRiskFlag.findAll({
          where: { cohortProgramId: program.id, status: "open" },
          attributes: ["uuid", "businessId", "riskLevel", "reasons", "detectedAt"],
          order: [["detectedAt", "DESC"]],
        }),
      ]);

    // Names for anything keyed by business, so the list reads as enterprises
    // rather than ids.
    const businessIds = [
      ...new Set(
        [...reportsAwaitingReview, ...behind, ...risks]
          .map((row) => row.businessId)
          .filter(Boolean),
      ),
    ];

    const businesses = businessIds.length
      ? await Business.findAll({
          where: { id: { [Op.in]: businessIds } },
          attributes: ["id", "name"],
          raw: true,
        })
      : [];

    const nameOf = new Map(businesses.map((row) => [row.id, row.name]));

    successResponse(res, {
      program: { uuid: program.uuid, title: program.title },
      summary: {
        overdueActivities: overdueActivities.length,
        awaitingReview: reportsAwaitingReview.length,
        fallingBehind: behind.length,
        openRisks: risks.length,
        escalated: risks.filter((row) => row.riskLevel === "critical").length,
      },
      overdueActivities: overdueActivities.map((row) => ({
        uuid: row.uuid,
        name: row.name,
        activityType: row.activityType,
        due: row.dueDate || row.activityDate,
      })),
      awaitingReview: reportsAwaitingReview.map((row) => ({
        uuid: row.uuid,
        reportingPeriod: row.reportingPeriod,
        business: nameOf.get(row.businessId) || null,
      })),
      fallingBehind: behind.map((row) => ({
        uuid: row.uuid,
        reportingPeriod: row.reportingPeriod,
        business: nameOf.get(row.businessId) || null,
        due: row.dueDate,
      })),
      risks: risks.map((row) => ({
        uuid: row.uuid,
        business: nameOf.get(row.businessId) || null,
        riskLevel: row.riskLevel,
        reasons: Array.isArray(row.reasons) ? row.reasons : [],
        detectedAt: row.detectedAt,
      })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Raise the current alerts to the people who run the programme. Deliberate
// rather than automatic: a lead decides when the team is told, and nothing
// here writes to enterprises.
const raiseProgramAlerts = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    if (!(await canAccessCohortProgram(req, program))) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    const now = new Date();

    const [overdue, awaitingReview, behind, escalated] = await Promise.all([
      MeActivity.count({
        where: {
          cohortProgramId: program.id,
          status: { [Op.notIn]: ["completed", "cancelled"] },
          [Op.or]: [
            { dueDate: { [Op.lt]: now } },
            { dueDate: null, activityDate: { [Op.lt]: now } },
          ],
        },
      }),
      MePeriodicReport.count({
        where: { cohortProgramId: program.id, status: "submitted" },
      }),
      MePeriodicReport.count({
        where: {
          cohortProgramId: program.id,
          dueDate: { [Op.lt]: now },
          status: { [Op.in]: ["draft", "overdue"] },
        },
      }),
      MeRiskFlag.count({
        where: {
          cohortProgramId: program.id,
          status: "open",
          riskLevel: "critical",
        },
      }),
    ]);

    const lines = [];
    if (overdue) lines.push(`${overdue} overdue activity(s)`);
    if (awaitingReview) lines.push(`${awaitingReview} report(s) awaiting review`);
    if (behind) lines.push(`${behind} participant report(s) overdue`);
    if (escalated) lines.push(`${escalated} escalated risk(s)`);

    if (!lines.length) {
      return successResponse(res, { raised: 0, message: "Nothing needs attention" });
    }

    // The programme's own leads, plus whoever asked - staff, never enterprises.
    const leads = await CohortProgramLead.findAll({
      where: { cohortProgramId: program.id },
      attributes: ["userId"],
      raw: true,
    });

    const userIds = [
      ...new Set([
        ...leads.map((row) => row.userId),
        req.user ? req.user.id : null,
      ].filter(Boolean)),
    ];

    const message = `${program.title} needs attention: ${lines.join(", ")}`;

    await Notification.bulkCreate(
      userIds.map((userId) => ({ userId, to: "BDA", message })),
    );

    successResponse(res, { raised: userIds.length, message });
  } catch (error) {
    errorResponse(res, error);
  }
};


// ------------------------------------------------------------------- reports
//
// Monthly, quarterly, donor and final reports, built from the programme's own
// records instead of rebuilt from a spreadsheet each time.
//
// composeProgramReport computes the figures and returns them without saving,
// so a lead can see what a period looks like before committing to it.
// Saving freezes that snapshot onto the report: a report sent to a donor in
// October must still say in March what it said in October, which recomputing
// on read would quietly break.

// A date filter for a column, or nothing when the report covers all time.
const inPeriod = (column, from, to) => {
  if (!from && !to) return {};
  const range = {};
  if (from) range[Op.gte] = from;
  if (to) range[Op.lte] = to;
  return { [column]: range };
};

const sum = (rows, key) =>
  rows.reduce((total, row) => total + Number(row[key] || 0), 0);

// Everything a report says about a programme over a period. Pure computation:
// it reads, and never writes.
const buildSnapshot = async (program, from, to) => {
  const memberships = await CohortMembership.findAll({
    where: { cohortProgramId: program.id },
    attributes: ["businessId", "status", "completionStatus"],
    raw: true,
  });

  const businessIds = [...new Set(memberships.map((row) => row.businessId))];

  const [
    activities,
    employment,
    funding,
    reports,
    risks,
    indicators,
    grants,
  ] = await Promise.all([
    MeActivity.findAll({
      where: {
        cohortProgramId: program.id,
        ...inPeriod("activityDate", from, to),
      },
      attributes: [
        "uuid", "name", "activityType", "activityDate", "status",
        "actualParticipants", "plannedParticipants", "budgetPlanned", "cost",
      ],
      raw: true,
    }),

    // Demographics are counted from verified employment rows only - the same
    // bar the M&E headline figures use, so a report cannot claim more than
    // has been checked.
    MeEmploymentRecord.findAll({
      where: {
        cohortProgramId: program.id,
        verificationStatus: "verified",
        ...inPeriod("reportingDate", from, to),
      },
      attributes: [
        "permanentMale", "permanentFemale", "temporaryMale", "temporaryFemale",
        "youthEmployees", "employeesWithDisabilities", "jobsCreated",
      ],
      raw: true,
    }),

    MeFundingLinkage.findAll({
      where: {
        cohortProgramId: program.id,
        status: "funded",
        ...inPeriod("receivedDate", from, to),
      },
      attributes: ["amountReceived", "currency", "opportunityType", "counterparty"],
      raw: true,
    }),

    MePeriodicReport.findAll({
      where: {
        cohortProgramId: program.id,
        ...inPeriod("createdAt", from, to),
      },
      attributes: [
        "uuid", "businessId", "reportingPeriod", "status",
        "keyMilestone", "biggestChallenge", "supportRequired",
      ],
      raw: true,
    }),

    MeRiskFlag.findAll({
      where: { cohortProgramId: program.id, status: "open" },
      attributes: ["uuid", "businessId", "riskLevel", "reasons"],
      raw: true,
    }),

    MeIndicator.findAll({
      where: { cohortProgramId: program.id, archivedAt: null },
      attributes: ["id", "uuid", "name", "unit", "baseline", "target"],
      raw: true,
    }).catch(() => []),

    // Grants hang off the enterprise, not the programme, so they are reached
    // through the roster.
    businessIds.length
      ? Milestone.findAll({
          where: { businessId: { [Op.in]: businessIds } },
          attributes: ["uuid", "businessId", "trancheAmount", "disbursed", "status"],
          raw: true,
        })
      : [],
  ]);

  // Latest verified value per indicator, so "where we are" is one number
  // rather than a series.
  const indicatorValues = indicators.length
    ? await MeIndicatorValue.findAll({
        where: { indicatorId: { [Op.in]: indicators.map((row) => row.id) } },
        attributes: ["indicatorId", "value", "periodEnd"],
        order: [["periodEnd", "DESC"]],
        raw: true,
      }).catch(() => [])
    : [];

  const latestByIndicator = new Map();
  for (const row of indicatorValues) {
    if (!latestByIndicator.has(row.indicatorId)) {
      latestByIndicator.set(row.indicatorId, row.value);
    }
  }

  const businesses = businessIds.length
    ? await Business.findAll({
        where: { id: { [Op.in]: businessIds } },
        attributes: ["id", "name", "location"],
        raw: true,
      })
    : [];

  const nameOf = new Map(businesses.map((row) => [row.id, row.name]));

  const completed = activities.filter((row) => row.status === "completed");

  const male = sum(employment, "permanentMale") + sum(employment, "temporaryMale");
  const female =
    sum(employment, "permanentFemale") + sum(employment, "temporaryFemale");

  const byType = {};
  for (const row of completed) {
    byType[row.activityType] = (byType[row.activityType] || 0) + 1;
  }

  const budgetPlanned = sum(activities, "budgetPlanned");
  const budgetSpent = sum(activities, "cost");

  const disbursedGrants = grants.filter((row) => row.disbursed);

  return {
    period: { from: from || null, to: to || null },

    participants: {
      enrolled: businessIds.length,
      active: memberships.filter((row) => row.status === "active").length,
      completed: memberships.filter((row) => row.completionStatus === "completed").length,
      // Attendance across the activities that actually ran.
      reached: sum(completed, "actualParticipants"),
    },

    activities: {
      total: activities.length,
      completed: completed.length,
      byType,
    },

    demographics: {
      male,
      female,
      total: male + female,
      youth: sum(employment, "youthEmployees"),
      withDisabilities: sum(employment, "employeesWithDisabilities"),
      jobsCreated: sum(employment, "jobsCreated"),
      // Said out loud, because a demographic split that only covers verified
      // rows is not the same as one covering everybody.
      basis: "Verified employment records only",
    },

    capital: {
      raised: sum(funding, "amountReceived"),
      deals: funding.length,
      byType: funding.reduce((acc, row) => {
        acc[row.opportunityType] =
          (acc[row.opportunityType] || 0) + Number(row.amountReceived || 0);
        return acc;
      }, {}),
    },

    grants: {
      disbursed: sum(disbursedGrants, "trancheAmount"),
      tranchesDisbursed: disbursedGrants.length,
      tranchesOutstanding: grants.length - disbursedGrants.length,
      committed: sum(grants, "trancheAmount"),
    },

    budget: {
      planned: budgetPlanned,
      spent: budgetSpent,
      utilisation: budgetPlanned
        ? Math.round((budgetSpent / budgetPlanned) * 100)
        : null,
    },

    indicators: indicators.map((row) => ({
      name: row.name,
      unit: row.unit,
      baseline: row.baseline,
      target: row.target,
      current: latestByIndicator.get(row.id) ?? null,
    })),

    // Verbatim from the enterprises' own reports - the report quotes them
    // rather than paraphrasing.
    challenges: reports
      .filter((row) => String(row.biggestChallenge || "").trim())
      .slice(0, 10)
      .map((row) => ({
        business: nameOf.get(row.businessId) || null,
        period: row.reportingPeriod,
        text: row.biggestChallenge,
      })),

    caseStudies: reports
      .filter((row) => String(row.keyMilestone || "").trim())
      .slice(0, 6)
      .map((row) => ({
        business: nameOf.get(row.businessId) || null,
        period: row.reportingPeriod,
        text: row.keyMilestone,
      })),

    risks: risks.map((row) => ({
      business: nameOf.get(row.businessId) || null,
      riskLevel: row.riskLevel,
      reasons: Array.isArray(row.reasons) ? row.reasons : [],
    })),

    reporting: {
      submitted: reports.filter((row) =>
        ["submitted", "under_review", "verified"].includes(row.status),
      ).length,
      verified: reports.filter((row) => row.status === "verified").length,
      outstanding: reports.filter((row) =>
        ["draft", "overdue"].includes(row.status),
      ).length,
    },
  };
};

// Preview: what a report over this period would say, computed and returned
// without being stored.
const composeProgramReport = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const oversees =
      (await canAccessCohortProgram(req, program)) ||
      ["ME", "Finance"].includes(req.user.role);

    if (!oversees) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    const snapshot = await buildSnapshot(
      program,
      req.query.from || null,
      req.query.to || null,
    );

    successResponse(res, {
      program: { uuid: program.uuid, title: program.title },
      types: ProgramReport.TYPES,
      sections: ProgramReport.NARRATIVE_SECTIONS,
      canSave: await canAccessCohortProgram(req, program),
      snapshot,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getProgramReports = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const oversees =
      (await canAccessCohortProgram(req, program)) ||
      ["ME", "Finance"].includes(req.user.role);

    if (!oversees) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    // One report in full when asked for by uuid; otherwise the list, without
    // the snapshots - they are large and the list only needs the headers.
    if (req.params.recordUuid) {
      const report = await ProgramReport.findOne({
        where: { uuid: req.params.recordUuid, cohortProgramId: program.id },
        include: [{ model: User, as: "createdBy", attributes: ["name"] }],
      });

      if (!report) {
        return res
          .status(404)
          .json({ status: false, message: "Report not found" });
      }

      const data = report.toJSON();
      return successResponse(res, {
        program: { uuid: program.uuid, title: program.title },
        sections: ProgramReport.NARRATIVE_SECTIONS,
        canSave: await canAccessCohortProgram(req, program),
        report: {
          ...data,
          createdBy: data.createdBy ? data.createdBy.name : null,
        },
      });
    }

    const rows = await ProgramReport.findAll({
      where: { cohortProgramId: program.id },
      attributes: [
        "uuid", "reportType", "title", "periodStart", "periodEnd",
        "status", "generatedAt", "createdAt",
      ],
      include: [{ model: User, as: "createdBy", attributes: ["name"] }],
      order: [["createdAt", "DESC"]],
    });

    successResponse(res, {
      program: { uuid: program.uuid, title: program.title },
      types: ProgramReport.TYPES,
      canSave: await canAccessCohortProgram(req, program),
      count: rows.length,
      data: rows.map((row) => {
        const data = row.toJSON();
        return { ...data, createdBy: data.createdBy ? data.createdBy.name : null };
      }),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Save a report: the figures are recomputed once, here, and frozen onto it.
// A recordUuid edits an existing draft - its narrative changes, its snapshot
// does not, unless the caller explicitly asks to refresh it.
const saveProgramReport = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    if (!(await canAccessCohortProgram(req, program))) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    if (req.params.recordUuid) {
      const report = await ProgramReport.findOne({
        where: { uuid: req.params.recordUuid, cohortProgramId: program.id },
      });

      if (!report) {
        return res
          .status(404)
          .json({ status: false, message: "Report not found" });
      }

      if (report.status === "final") {
        return res.status(400).json({
          status: false,
          message: "A final report cannot be edited. Duplicate it instead.",
        });
      }

      const payload = {};
      if (req.body.title !== undefined) payload.title = req.body.title;
      if (req.body.narrative !== undefined) payload.narrative = req.body.narrative;

      if (req.body.status !== undefined) {
        if (!ProgramReport.STATUSES.includes(req.body.status)) {
          return res.status(400).json({
            status: false,
            message: "Status must be one of " + ProgramReport.STATUSES.join(", "),
          });
        }
        payload.status = req.body.status;
      }

      // Refreshing is deliberate: a draft can be re-based on today's figures,
      // but it never happens behind the lead's back.
      if (req.body.refresh) {
        payload.snapshot = await buildSnapshot(
          program,
          report.periodStart,
          report.periodEnd,
        );
        payload.generatedAt = new Date();
      }

      await report.update(payload);
      return successResponse(res, { uuid: report.uuid, status: report.status });
    }

    const reportType = req.body.reportType || "monthly";

    if (!ProgramReport.TYPES.includes(reportType)) {
      return res.status(400).json({
        status: false,
        message: "Report type must be one of " + ProgramReport.TYPES.join(", "),
      });
    }

    if (!String(req.body.title || "").trim()) {
      return res
        .status(400)
        .json({ status: false, message: "A report title is required" });
    }

    const from = req.body.periodStart || null;
    const to = req.body.periodEnd || null;

    if (from && to && new Date(from) > new Date(to)) {
      return res.status(400).json({
        status: false,
        message: "The reporting period cannot end before it starts",
      });
    }

    const snapshot = await buildSnapshot(program, from, to);

    const report = await ProgramReport.create({
      cohortProgramId: program.id,
      reportType,
      title: String(req.body.title).trim(),
      periodStart: from,
      periodEnd: to,
      status: "draft",
      snapshot,
      narrative: req.body.narrative || {},
      generatedAt: new Date(),
      createdById: req.user ? req.user.id : null,
    });

    successResponse(res, { uuid: report.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};


// ---------------------------------------------------------------- lead view
//
// The programme dashboard: the first screen a Program Lead opens, answering
// two questions - are we on track, and what needs attention today.
//
// It composes what the other endpoints already compute rather than counting
// again: buildSnapshot for the figures, the same definitions of overdue and
// falling behind that the alert board uses. One place decides what a number
// means, so the dashboard and the report can never disagree.

// Traffic lights. The thresholds are written here, once, and returned with
// the payload so the screen can show why something is amber rather than
// leaving a lead to guess at the rule.
const GREEN = "on_track";
const AMBER = "attention";
const RED = "critical";

// Higher is better: completion, attendance, KPI achievement.
const upIsGood = (value, { amber, red }) => {
  if (value === null || value === undefined) return null;
  if (value < red) return RED;
  if (value < amber) return AMBER;
  return GREEN;
};

// Lower is better: overdue counts, open risks.
const downIsGood = (value, { amber, red }) => {
  if (value === null || value === undefined) return null;
  if (value >= red) return RED;
  if (value >= amber) return AMBER;
  return GREEN;
};

// Budget is a band: well under is as much a signal as over.
const budgetLight = (utilisation) => {
  if (utilisation === null || utilisation === undefined) return null;
  if (utilisation > 110) return RED;
  if (utilisation > 100 || utilisation < 50) return AMBER;
  return GREEN;
};

const THRESHOLDS = {
  cohortProgress: { amber: 60, red: 30, direction: "up", unit: "% completed" },
  attendance: { amber: 70, red: 50, direction: "up", unit: "% of expected" },
  kpiAchievement: { amber: 70, red: 40, direction: "up", unit: "% of target" },
  diagnostic: { amber: 60, red: 30, direction: "up", unit: "% with an endline" },
  budget: { amber: 100, red: 110, direction: "band", unit: "% utilisation" },
  overdueReports: { amber: 1, red: 5, direction: "down", unit: "reports" },
  pendingApprovals: { amber: 3, red: 10, direction: "down", unit: "items" },
  risks: { amber: 1, red: 3, direction: "down", unit: "open flags" },
  overdueActivities: { amber: 1, red: 5, direction: "down", unit: "activities" },
};

// The worst light wins: a programme with one critical area is not "on track"
// because everything else is green.
const overallOf = (lights) => {
  const values = lights.filter(Boolean);
  if (values.includes(RED)) return RED;
  if (values.includes(AMBER)) return AMBER;
  return values.length ? GREEN : null;
};

const programOverview = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const oversees =
      (await canAccessCohortProgram(req, program)) ||
      ["ME", "Finance"].includes(req.user.role);

    if (!oversees) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    // The whole programme, not a reporting window: a dashboard answers "where
    // are we now", which is cumulative.
    const snapshot = await buildSnapshot(program, null, null);

    const now = new Date();

    const memberships = await CohortMembership.findAll({
      where: { cohortProgramId: program.id },
      attributes: ["businessId", "status", "attendanceRate", "baselineCompleted", "endlineCompleted"],
      raw: true,
    });

    const businessIds = [...new Set(memberships.map((row) => row.businessId))];

    const [upcoming, overdueActivities, evidencePending, milestones, risks] =
      await Promise.all([
        MeActivity.findAll({
          where: {
            cohortProgramId: program.id,
            status: { [Op.notIn]: ["completed", "cancelled"] },
            activityDate: { [Op.gte]: now },
          },
          attributes: ["uuid", "name", "activityType", "activityDate", "dueDate"],
          order: [["activityDate", "ASC"]],
          limit: 6,
        }),

        MeActivity.count({
          where: {
            cohortProgramId: program.id,
            status: { [Op.notIn]: ["completed", "cancelled"] },
            [Op.or]: [
              { dueDate: { [Op.lt]: now } },
              { dueDate: null, activityDate: { [Op.lt]: now } },
            ],
          },
        }),

        MeEvidence.count({
          where: { cohortProgramId: program.id, verificationStatus: "pending" },
        }).catch(() => 0),

        businessIds.length
          ? Milestone.findAll({
              where: { businessId: { [Op.in]: businessIds } },
              attributes: ["uuid", "businessId", "status", "disbursed", "verificationRequested", "trancheAmount"],
              raw: true,
            })
          : [],

        MeRiskFlag.findAll({
          where: { cohortProgramId: program.id, status: "open" },
          attributes: ["uuid", "businessId", "riskLevel", "reasons"],
          raw: true,
        }),
      ]);

    const businesses = businessIds.length
      ? await Business.findAll({
          where: { id: { [Op.in]: businessIds } },
          attributes: ["id", "name"],
          raw: true,
        })
      : [];

    const nameOf = new Map(businesses.map((row) => [row.id, row.name]));

    // --- the measures the lights are read from -------------------------
    const enrolled = memberships.length;

    // A measure with nothing behind it yet is not zero - it is unmeasured,
    // and lighting it red would have every new programme open as critical.
    // Each of these returns null until there is something to judge, and the
    // screen says "not yet measured" rather than showing a false alarm.
    const programmeEnded =
      program.endDate && new Date(program.endDate) < now;

    const cohortProgress =
      !enrolled || (!snapshot.participants.completed && !programmeEnded)
        ? null
        : Math.round((snapshot.participants.completed / enrolled) * 100);

    // Attendance as recorded per enterprise on the roster, averaged over the
    // ones that actually have a figure.
    const attendances = memberships
      .map((row) => Number(row.attendanceRate))
      .filter((value) => Number.isFinite(value));

    // Nothing has run yet, so there is no attendance to report on.
    const attendance =
      !attendances.length || !snapshot.activities.completed
        ? null
        : Math.round(attendances.reduce((a, b) => a + b, 0) / attendances.length);

    // Diagnostic improvement: how much of the cohort has been measured twice.
    // Without an endline there is no improvement to speak of.
    const withEndline = memberships.filter((row) => row.endlineCompleted).length;
    const withBaseline = memberships.filter((row) => row.baselineCompleted).length;

    // Until a baseline exists there is no improvement to measure against.
    const diagnostic =
      !enrolled || !withBaseline
        ? null
        : Math.round((withEndline / enrolled) * 100);

    // KPI achievement: indicators at or above target, of those with a target.
    const targeted = snapshot.indicators.filter(
      (row) => row.target !== null && row.target !== undefined && row.target !== "",
    );

    const achieved = targeted.filter(
      (row) => Number(row.current) >= Number(row.target),
    ).length;

    const kpiAchievement = targeted.length
      ? Math.round((achieved / targeted.length) * 100)
      : null;

    const awaitingReview = snapshot.reporting.submitted - snapshot.reporting.verified;
    const milestonesAwaiting = milestones.filter(
      (row) => row.verificationRequested && !row.disbursed,
    ).length;

    const pendingApprovals = awaitingReview + milestonesAwaiting + evidencePending;

    // Enterprises needing a look: a risk flag, or an overdue report of their
    // own. Named, because "3 need intervention" is not actionable.
    const riskBusinesses = new Set(risks.map((row) => row.businessId));

    const needIntervention = businesses
      .filter((row) => riskBusinesses.has(row.id))
      .map((row) => {
        const theirs = risks.filter((flag) => flag.businessId === row.id);
        return {
          name: row.name,
          level: theirs.some((flag) => flag.riskLevel === "critical")
            ? "critical"
            : "attention",
          reasons: [
            ...new Set(theirs.flatMap((flag) => (Array.isArray(flag.reasons) ? flag.reasons : []))),
          ].slice(0, 3),
        };
      });

    const lights = {
      cohortProgress: upIsGood(cohortProgress, THRESHOLDS.cohortProgress),
      attendance: upIsGood(attendance, THRESHOLDS.attendance),
      diagnostic: upIsGood(diagnostic, THRESHOLDS.diagnostic),
      kpiAchievement: upIsGood(kpiAchievement, THRESHOLDS.kpiAchievement),
      budget: budgetLight(snapshot.budget.utilisation),
      overdueReports: downIsGood(snapshot.reporting.outstanding, THRESHOLDS.overdueReports),
      overdueActivities: downIsGood(overdueActivities, THRESHOLDS.overdueActivities),
      pendingApprovals: downIsGood(pendingApprovals, THRESHOLDS.pendingApprovals),
      risks: downIsGood(risks.length, THRESHOLDS.risks),
    };

    successResponse(res, {
      program: {
        uuid: program.uuid,
        title: program.title,
        status: program.status,
        startDate: program.startDate,
        endDate: program.endDate,
      },

      overall: overallOf(Object.values(lights)),
      lights,
      thresholds: THRESHOLDS,

      measures: {
        cohortProgress,
        attendance,
        diagnostic,
        kpiAchievement,
        budgetUtilisation: snapshot.budget.utilisation,
        overdueReports: snapshot.reporting.outstanding,
        overdueActivities,
        pendingApprovals,
        openRisks: risks.length,
      },

      cohort: {
        enrolled,
        active: snapshot.participants.active,
        completed: snapshot.participants.completed,
        reached: snapshot.participants.reached,
      },

      activities: {
        completed: snapshot.activities.completed,
        total: snapshot.activities.total,
        upcoming: upcoming.map((row) => ({
          uuid: row.uuid,
          name: row.name,
          activityType: row.activityType,
          when: row.dueDate || row.activityDate,
        })),
      },

      milestones: {
        total: milestones.length,
        disbursed: milestones.filter((row) => row.disbursed).length,
        awaitingReview: milestonesAwaiting,
      },

      finance: {
        grantsDisbursed: snapshot.grants.disbursed,
        grantsCommitted: snapshot.grants.committed,
        capitalFacilitated: snapshot.capital.raised,
        budgetPlanned: snapshot.budget.planned,
        budgetSpent: snapshot.budget.spent,
      },

      approvals: {
        reportsAwaitingReview: awaitingReview,
        milestonesAwaitingReview: milestonesAwaiting,
        evidencePending,
      },

      indicators: snapshot.indicators,
      needIntervention,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};


// ------------------------------------------------------------ grant recipients
//
// Not every startup on a programme gets a grant. The Program Lead decides who
// does, which is where the grant process now starts - it used to begin with
// the Finance Officer picking startups in Grant Management.
//
// The roster is stored the way the existing grant tracker already reads it: a
// JSON line on the linked grant Program behind __TRACKER_STARTUPS__. Writing
// the established format rather than a new table is deliberate - milestones,
// tranche disbursement, the BDA tracker and the startup's own Grant
// Management view all read that marker, and moving the storage would have
// meant rewriting every one of them at once.

const STARTUPS_MARKER = "__TRACKER_STARTUPS__:";
const CATEGORIES_MARKER = "__TRACKER_CATEGORIES__:";
const COHORT_MARKER = "__TRACKER_COHORT__:";
const BDAS_MARKER = "__TRACKER_BDAS__:";

const parseMarker = (text, marker) => {
  const raw = String(text || "");
  const idx = raw.lastIndexOf(marker);
  if (idx === -1) return [];
  const line = raw.slice(idx + marker.length).split("\n")[0].trim();
  try {
    const value = JSON.parse(line);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

// The human half of the description, with every marker line removed.
const cleanDescription = (text) =>
  String(text || "")
    .split("\n")
    .filter(
      (line) =>
        ![STARTUPS_MARKER, CATEGORIES_MARKER, COHORT_MARKER, BDAS_MARKER].some(
          (marker) => line.trimStart().startsWith(marker),
        ),
    )
    .join("\n")
    .trim();

const buildDescription = (description, categories, startups, cohortUuid, bdas) => {
  let out =
    `${cleanDescription(description)}\n\n` +
    `${STARTUPS_MARKER}${JSON.stringify(startups || [])}\n` +
    `${CATEGORIES_MARKER}${JSON.stringify(categories || [])}`;

  if (cohortUuid) out += `\n${COHORT_MARKER}${JSON.stringify([cohortUuid])}`;
  if (bdas && bdas.length) out += `\n${BDAS_MARKER}${JSON.stringify(bdas)}`;

  return out;
};

// The grant programme that tracks this cohort.
//
// New ones carry a cohort link marker. The ones already in the database do
// not — they predate that link and are typed "program", not "grant" — so a
// marker-only lookup would miss them, and the first save would open a second
// grant programme beside the first, orphaning every recipient already
// recorded against it. Those are matched on title instead and adopted: the
// link is written on that first save, so the match is exact from then on.
const grantProgramFor = async (program) => {
  const tracked = await Program.findAll({
    where: { description: { [Op.like]: `%${STARTUPS_MARKER}%` } },
  });

  const linked = tracked.find((row) =>
    parseMarker(row.description, COHORT_MARKER).includes(program.uuid),
  );

  if (linked) return linked;

  // Only ever adopt one that no other cohort has claimed, so two cohorts of
  // the same name cannot end up fighting over a single roster.
  const title = String(program.title || "").trim().toLowerCase();

  return (
    tracked.find(
      (row) =>
        String(row.title || "").trim().toLowerCase() === title &&
        parseMarker(row.description, COHORT_MARKER).length === 0,
    ) || null
  );
};

const getGrantRecipients = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const oversees =
      (await canAccessCohortProgram(req, program)) ||
      ["ME", "Finance"].includes(req.user.role);

    if (!oversees) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    // Everyone on the programme is a candidate; the lead picks from them.
    const memberships = await CohortMembership.findAll({
      where: { cohortProgramId: program.id },
      include: [
        {
          model: Business,
          required: true,
          attributes: ["id", "uuid", "name", "location", "userId"],
          include: [{ model: BusinessSector, attributes: ["name"] }],
        },
      ],
    });

    const grantProgram = await grantProgramFor(program);
    const recipients = grantProgram
      ? parseMarker(grantProgram.description, STARTUPS_MARKER)
      : [];

    const byBusiness = new Map(
      recipients
        .filter((row) => row && row.businessUuid)
        .map((row) => [row.businessUuid, row]),
    );

    // The grant detail page is addressed by the entrepreneur behind the
    // business, so the owning account is resolved here — the lead should not
    // have to look it up to open a recipient's grant.
    const ownerIds = [
      ...new Set(
        memberships
          .map((row) => row.Business && row.Business.userId)
          .filter(Boolean),
      ),
    ];

    const owners = ownerIds.length
      ? await User.findAll({
          where: { id: { [Op.in]: ownerIds } },
          attributes: ["id", "uuid"],
          raw: true,
        })
      : [];

    const ownerUuid = new Map(owners.map((row) => [row.id, row.uuid]));

    // "Manage grant" opens the recipient's grant workspace - milestones,
    // activity-level review, reports - which is addressed by its tracker record.
    const trackers = grantProgram && ownerIds.length
      ? await TrackerEnterprise.findAll({
          where: { programId: grantProgram.id, entreprenuerId: { [Op.in]: ownerIds } },
          attributes: ["uuid", "entreprenuerId"],
          order: [["updatedAt", "DESC"]],
          raw: true,
        })
      : [];
    const trackerUuid = new Map();
    for (const row of trackers) {
      if (!trackerUuid.has(row.entreprenuerId)) trackerUuid.set(row.entreprenuerId, row.uuid);
    }

    const candidates = memberships
      .filter((row) => row.Business)
      .map((row) => {
        const held = byBusiness.get(row.Business.uuid) || null;

        return {
          businessUuid: row.Business.uuid,
          trackerEnterpriseUuid: trackerUuid.get(row.Business.userId) || null,
          // Falls back to whatever the roster already recorded, for a startup
          // whose owner account has since been removed.
          entreprenuerUuid:
            ownerUuid.get(row.Business.userId) || held?.entreprenuerUuid || null,
          name: row.Business.name,
          location: row.Business.location,
          sector: row.Business.BusinessSector?.name || null,
          isRecipient: !!held,
          grantUsd: held ? Number(held.grantUsd || 0) : 0,
          grantPurpose: held ? held.grantPurpose || "" : "",
          // Read-only here: disbursement is the Finance Officer's step, and a
          // lead editing the roster must never appear to undo it.
          disbursed: held ? !!held.disbursed : false,
          disbursedAmount: held ? Number(held.disbursedAmount || 0) : 0,
          utilized: held ? Number(held.utilized || 0) : 0,
        };
      });

    successResponse(res, {
      program: { uuid: program.uuid, title: program.title },
      grantProgram: grantProgram
        ? { uuid: grantProgram.uuid, title: grantProgram.title }
        : null,
      canEdit: await canAccessCohortProgram(req, program),
      summary: {
        onProgramme: candidates.length,
        recipients: candidates.filter((row) => row.isRecipient).length,
        committed: candidates.reduce(
          (total, row) => total + (row.isRecipient ? row.grantUsd : 0),
          0,
        ),
        disbursed: candidates.reduce(
          (total, row) => total + (row.disbursed ? row.disbursedAmount || row.grantUsd : 0),
          0,
        ),
      },
      count: candidates.length,
      data: candidates,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Replace the grant roster with exactly the startups named.
//
// Existing members are carried over whole and only their grant figure and
// purpose updated: disbursement, utilisation, tranches and the assigned BDA
// live on those same objects, and rebuilding them from scratch would erase a
// disbursement the Finance Officer had already recorded.
// A grant recipient reports through the grant tracker: its Grant Management
// page, milestone reports and tranche schedule all hang off a TrackerEnterprise.
// Selecting a recipient opens that record once, supervised by the staff member
// responsible for the startup - its assigned advisor or mentor, the programme's
// lead, or whoever made the selection - so the startup can submit milestones
// and reports straight away. An existing record only has its grant updated.
const ensureGrantTrackers = async ({ program, grantProgram, memberships, recipients, fallbackUserId }) => {
  const lead = await CohortProgramLead.findOne({
    where: { cohortProgramId: program.id },
    attributes: ["userId"],
    order: [["createdAt", "ASC"]],
  });
  const byBusiness = new Map(
    memberships.filter((row) => row.Business).map((row) => [row.Business.uuid, row]),
  );

  let opened = 0;
  for (const recipient of recipients) {
    const membership = byBusiness.get(recipient.businessUuid);
    const business = membership && membership.Business;
    if (!business || !business.userId) continue;

    const existing = await TrackerEnterprise.findOne({
      where: { entreprenuerId: business.userId, programId: grantProgram.id },
    });
    if (existing) {
      await existing.update({ grantUsd: Number(recipient.grantUsd || 0) });
      continue;
    }

    const mentorId =
      membership.assignedAdvisorId || membership.assignedMentorId || (lead && lead.userId) || fallbackUserId;
    if (!mentorId) continue;

    await TrackerEnterprise.create({
      mentorId,
      entreprenuerId: business.userId,
      businessId: business.id,
      programId: grantProgram.id,
      name: business.name || "Enterprise",
      category: program.category || grantProgram.programCategory || null,
      ceSector: recipient.sector || null,
      district: business.location || null,
      grantUsd: Number(recipient.grantUsd || 0),
    });
    opened += 1;
  }
  return opened;
};

const setGrantRecipients = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    if (!(await canAccessCohortProgram(req, program))) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    const wanted = Array.isArray(req.body.recipients) ? req.body.recipients : null;

    if (!wanted) {
      return res
        .status(400)
        .json({ status: false, message: "recipients must be an array" });
    }

    const memberships = await CohortMembership.findAll({
      where: { cohortProgramId: program.id },
      include: [
        {
          model: Business,
          required: true,
          attributes: ["id", "uuid", "name", "userId"],
          include: [{ model: BusinessSector, attributes: ["name"] }],
        },
      ],
    });

    const onProgramme = new Map(
      memberships.filter((row) => row.Business).map((row) => [row.Business.uuid, row]),
    );

    // A startup that is not on the programme cannot be given its grant.
    const stray = wanted.find((row) => !onProgramme.has(row.businessUuid));
    if (stray) {
      return res.status(400).json({
        status: false,
        message: "One of those startups is not on this program",
      });
    }

    let grantProgram = await grantProgramFor(program);

    // The first time a lead awards a grant on a programme there is nothing to
    // track against yet, so the grant programme is opened here rather than
    // waiting on the Finance Officer to create it.
    if (!grantProgram) {
      grantProgram = await Program.create({
        title: program.title,
        // Both are NOT NULL on this legacy table.
        programCategory: program.category || "Grant",
        image: program.image || "/images/business-class-hero.svg",
        description: buildDescription(
          `Grant tracking for ${program.title}.`,
          [],
          [],
          program.uuid,
          [],
        ),
        type: "grant",
        startDate: program.startDate || null,
        endDate: program.endDate || null,
        image: program.image || null,
      });
    }

    const existing = parseMarker(grantProgram.description, STARTUPS_MARKER);
    const byBusiness = new Map(
      existing.filter((row) => row && row.businessUuid).map((row) => [row.businessUuid, row]),
    );

    // The startup's own Grant Management - the sidebar entry, the route guard
    // and the milestones page - finds its grant by the founder's account uuid,
    // so every recipient must carry it. Without it a startup added here could
    // never see or report on the grant it was given.
    const founderIds = [...new Set(wanted.map((row) => onProgramme.get(row.businessUuid).Business.userId).filter(Boolean))];
    const founders = founderIds.length
      ? await User.findAll({ where: { id: { [Op.in]: founderIds } }, attributes: ["id", "uuid"], raw: true })
      : [];
    const founderUuid = new Map(founders.map((row) => [row.id, row.uuid]));

    const next = wanted.map((row) => {
      const membership = onProgramme.get(row.businessUuid);
      const business = membership.Business;
      const held = byBusiness.get(row.businessUuid);

      // Everything already recorded against this startup is preserved; only
      // what the lead controls is written.
      return {
        ...(held || {
          businessUuid: business.uuid,
          disbursedAmount: 0,
          utilized: 0,
          reportDate: null,
          disbursed: false,
          overdueReports: 0,
        }),
        entreprenuerUuid: (held && held.entreprenuerUuid) || founderUuid.get(business.userId) || null,
        businessUuid: business.uuid,
        name: business.name,
        sector: business.BusinessSector?.name || held?.sector || null,
        grantUsd: Number(row.grantUsd || 0),
        grantPurpose: String(row.grantPurpose || ""),
      };
    });

    // Roster entries for startups that are not on this programme's current
    // membership are carried through untouched. They were put there by
    // someone — a startup that has since left, or one added directly in Grant
    // Management — and a lead editing their own selection must not silently
    // delete a record they cannot even see on this screen.
    const chosen = new Set(next.map((row) => row.businessUuid));

    const untouched = existing.filter(
      (row) =>
        row &&
        row.businessUuid &&
        !chosen.has(row.businessUuid) &&
        !onProgramme.has(row.businessUuid),
    );

    await grantProgram.update({
      description: buildDescription(
        grantProgram.description,
        parseMarker(grantProgram.description, CATEGORIES_MARKER),
        [...next, ...untouched],
        program.uuid,
        parseMarker(grantProgram.description, BDAS_MARKER),
      ),
    });

    const trackersOpened = await ensureGrantTrackers({
      program,
      grantProgram,
      memberships,
      recipients: next,
      fallbackUserId: req.user.id,
    });

    successResponse(res, {
      trackersOpened,
      grantProgramUuid: grantProgram.uuid,
      recipients: next.length,
      committed: next.reduce((total, row) => total + Number(row.grantUsd || 0), 0),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};


// ------------------------------------------------------------------ workplan
//
// The programme workplan: outputs, the activities that deliver each, and a
// month-by-week grid showing when each runs.
//
// The grid columns are computed here rather than in the page, so the server
// decides once what "week 2 of February" means and every reader — the screen,
// a future export, a report — agrees.

const DAY = 24 * 60 * 60 * 1000;

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const iso = (date) => date.toISOString().slice(0, 10);

// Month columns, each split into the weeks that start within it. A week is a
// calendar week beginning Monday, which is how a plan is read aloud.
const buildColumns = (from, to) => {
  const months = [];
  if (!from || !to || from > to) return months;

  // Back up to the Monday on or before the start, so the first cell is a whole
  // week rather than a stub.
  const cursor = new Date(from);
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));

  let guard = 0;

  while (cursor <= to && guard < 520) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor.getTime() + 6 * DAY);

    const key = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}`;
    let month = months[months.length - 1];

    if (!month || month.key !== key) {
      month = {
        key,
        label: weekStart.toLocaleDateString("en-GB", { month: "long" }),
        year: weekStart.getFullYear(),
        weeks: [],
      };
      months.push(month);
    }

    month.weeks.push({ start: iso(weekStart), end: iso(weekEnd) });

    cursor.setDate(cursor.getDate() + 7);
    guard += 1;
  }

  return months;
};

const getProgramWorkplan = async (req, res) => {
  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const oversees =
      (await canAccessCohortProgram(req, program)) ||
      ["ME", "Finance"].includes(req.user.role);

    if (!oversees) {
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    const outputs = await ProgramWorkplanOutput.findAll({
      where: { cohortProgramId: program.id },
      include: [
        {
          model: ProgramWorkplanActivity,
          as: "activities",
          include: [{ model: User, as: "owner", attributes: ["uuid", "name"] }],
        },
      ],
      order: [
        ["position", "ASC"],
        [{ model: ProgramWorkplanActivity, as: "activities" }, "position", "ASC"],
      ],
    });

    const data = outputs.map((output) => {
      const row = output.toJSON();
      return {
        uuid: row.uuid,
        title: row.title,
        description: row.description,
        activities: (row.activities || []).map((activity) => ({
          uuid: activity.uuid,
          title: activity.title,
          startDate: activity.startDate,
          endDate: activity.endDate,
          status: activity.status,
          owner: activity.owner
            ? { uuid: activity.owner.uuid, name: activity.owner.name }
            : null,
        })),
      };
    });

    // The grid spans whatever the plan actually covers, falling back to the
    // programme's own dates so an empty plan still opens on a sensible range.
    const dates = data
      .flatMap((output) => output.activities)
      .flatMap((activity) => [asDate(activity.startDate), asDate(activity.endDate)])
      .filter(Boolean);

    const from =
      dates.length > 0
        ? new Date(Math.min(...dates.map((d) => d.getTime())))
        : asDate(program.startDate) || new Date();

    const to =
      dates.length > 0
        ? new Date(Math.max(...dates.map((d) => d.getTime())))
        : asDate(program.endDate) ||
          new Date(from.getTime() + 90 * DAY);

    successResponse(res, {
      program: {
        uuid: program.uuid,
        title: program.title,
        startDate: program.startDate,
        endDate: program.endDate,
      },
      statuses: ProgramWorkplanActivity.STATUSES,
      canEdit: await canAccessCohortProgram(req, program),
      months: buildColumns(from, to),
      owners: await User.findAll({
        where: { role: { [Op.in]: ["Admin", "BDA", "Mentor", "Finance", "ME"] } },
        attributes: ["uuid", "name", "role"],
        order: [["name", "ASC"]],
      }),
      count: data.length,
      data,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Replace the whole plan with what was sent.
//
// A workplan is edited as one document — rows reordered, activities moved
// between outputs, several dates nudged at once — so saving it whole is what
// the editing actually does. Sent as one transaction: a half-written plan
// would be worse than none.
const saveProgramWorkplan = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const program = await CohortProgram.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
      transaction,
    });

    if (!program) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    if (!(await canAccessCohortProgram(req, program))) {
      await transaction.rollback();
      return res
        .status(403)
        .json({ status: false, message: "You are not assigned to this program" });
    }

    const outputs = Array.isArray(req.body.outputs) ? req.body.outputs : null;

    if (!outputs) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ status: false, message: "outputs must be an array" });
    }

    for (const output of outputs) {
      if (!String(output.title || "").trim()) {
        await transaction.rollback();
        return res
          .status(400)
          .json({ status: false, message: "Every output needs a title" });
      }

      for (const activity of output.activities || []) {
        if (!String(activity.title || "").trim()) {
          await transaction.rollback();
          return res
            .status(400)
            .json({ status: false, message: "Every activity needs a title" });
        }

        if (
          activity.status &&
          !ProgramWorkplanActivity.STATUSES.includes(activity.status)
        ) {
          await transaction.rollback();
          return res.status(400).json({
            status: false,
            message:
              "Status must be one of " +
              ProgramWorkplanActivity.STATUSES.join(", "),
          });
        }

        const start = asDate(activity.startDate);
        const end = asDate(activity.endDate);

        if (start && end && start > end) {
          await transaction.rollback();
          return res.status(400).json({
            status: false,
            message: `"${activity.title}" cannot end before it starts`,
          });
        }
      }
    }

    // Owners arrive as user uuids; the column holds the id.
    const ownerUuids = [
      ...new Set(
        outputs
          .flatMap((output) => output.activities || [])
          .map((activity) => activity.ownerUuid)
          .filter(Boolean),
      ),
    ];

    const owners = ownerUuids.length
      ? await User.findAll({
          where: { uuid: { [Op.in]: ownerUuids } },
          attributes: ["id", "uuid"],
          raw: true,
          transaction,
        })
      : [];

    const ownerId = new Map(owners.map((row) => [row.uuid, row.id]));

    // Rewritten wholesale: the activities cascade with their outputs.
    await ProgramWorkplanOutput.destroy({
      where: { cohortProgramId: program.id },
      transaction,
    });

    for (const [index, output] of outputs.entries()) {
      const created = await ProgramWorkplanOutput.create(
        {
          cohortProgramId: program.id,
          title: String(output.title).trim(),
          description: output.description || null,
          position: index,
        },
        { transaction },
      );

      const activities = Array.isArray(output.activities)
        ? output.activities
        : [];

      for (const [order, activity] of activities.entries()) {
        await ProgramWorkplanActivity.create(
          {
            outputId: created.id,
            title: String(activity.title).trim(),
            startDate: activity.startDate || null,
            endDate: activity.endDate || null,
            ownerId: ownerId.get(activity.ownerUuid) || null,
            status: activity.status || "planned",
            position: order,
          },
          { transaction },
        );
      }
    }

    await transaction.commit();

    successResponse(res, {
      outputs: outputs.length,
      activities: outputs.reduce(
        (total, output) => total + (output.activities || []).length,
        0,
      ),
    });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

module.exports = {
  getProgramWorkplan,
  saveProgramWorkplan,
  getGrantRecipients,
  setGrantRecipients,
  ensureGrantTrackers,
  programOverview,
  composeProgramReport,
  getProgramReports,
  saveProgramReport,
  sendProgramAnnouncement,
  getProgramAnnouncements,
  programAlerts,
  raiseProgramAlerts,
  getProgramDocuments,
  saveProgramDocument,
  updateProgramDocument,
  archiveProgramDocument,
  saveProgramDocumentFolder,
  deleteProgramDocumentFolder,
  getCohortCoaching,
  setCohortCoaching,
  getCohortCalendar,
  saveCohortCalendarEntry,
  deleteCohortCalendarEntry,
  UNASSIGNED_KEY,
  getCohortDashboard,
  setStartupStatus,
  setReportingStatus,
  getCohortModules,
  getCohortAnalytics,
  getCohortSessions,
  createCohortSession,
  deleteCohortSession,
  updateCohortSession,
  getCohortPrograms,
  getPublicCohortPrograms,
  createCohortProgram,
  updateCohortProgram,
  deleteCohortProgram,
  getCohortStartups,
  setCohortStartups,
  getCohortLeads,
  setCohortLeads,
  getMyCohortPrograms,
  updateParticipation,
};
