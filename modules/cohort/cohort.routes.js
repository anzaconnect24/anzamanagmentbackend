const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const { requireRoles } = require("../../utils/authorization");
const documentUpload = require("../../utils/document_upload");
const {
  getCohortPrograms,
  getPublicCohortPrograms,
  createCohortProgram,
  updateCohortProgram,
  deleteCohortProgram,
  getCohortStartups,
  setCohortStartups,
  getCohortDashboard,
  setStartupStatus,
  setReportingStatus,
  getCohortSessions,
  createCohortSession,
  deleteCohortSession,
  updateCohortSession,
  getCohortModules,
  getCohortAnalytics,
  getCohortLeads,
  setCohortLeads,
  getMyCohortPrograms,
  updateParticipation,
  getCohortCalendar,
  getCohortCoaching,
  getProgramDocuments,
  sendProgramAnnouncement,
  composeProgramReport,
  getProgramReports,
  saveProgramReport,
  getProgramAnnouncements,
  programAlerts,
  raiseProgramAlerts,
  saveProgramDocument,
  updateProgramDocument,
  archiveProgramDocument,
  setCohortCoaching,
  saveCohortCalendarEntry,
  deleteCohortCalendarEntry,
} = require("./cohort.controller");

// Programme delivery is run by Business Development Advisors (role "BDA"),
// the single role that replaced the old Staff/Reviewer pair.
const VIEW_ROLES = ["Admin", "BDA", "Finance", "ME"];
const ROSTER_ROLES = ["Admin", "BDA"];
const ADMIN_ONLY = ["Admin"];

// The programme implementation calendar belongs to whoever runs the
// programme. The controller narrows it further to Admin or this programme’s
// assigned lead, so a Business Development Advisor cannot schedule work on a
// cohort that is not theirs.
const CALENDAR_ROLES = ["Admin", "BDA"];

// Coaching oversight is read by the people who run or deliver the programme;
// the controller decides what each of them may see inside it, and holds back
// the private notes on a confidential session. Assignment is narrower still -
// Admin or the programme lead - and is enforced in the controller.
const COACHING_ROLES = ["Admin", "BDA", "Mentor", "ME"];

// The document library is read by everyone who runs or reports on the
// programme; filing into it is narrowed in the controller to Admin and the
// programme lead.
const DOCUMENT_ROLES = ["Admin", "BDA", "ME", "Finance"];

const router = Router();

// Public: the sign-up form needs the programme list before an account exists.
router.get("/public", getPublicCohortPrograms);

// The signed-in startup's own programmes. Not restricted by role: the shared
// sidebar asks for it on every account, and anyone without a business simply
// gets an empty list. Must be declared before "/:uuid" routes so "mine" is not
// read as a programme uuid.
router.get("/mine", validateJWT, getMyCohortPrograms);

router.get("/", validateJWT, requireRoles(VIEW_ROLES), getCohortPrograms);
router.post("/", validateJWT, requireRoles(ADMIN_ONLY), createCohortProgram);

// Programme analytics: summary figures plus a row per course.
router.get(
  "/:uuid/analytics",
  validateJWT,
  requireRoles(VIEW_ROLES),
  getCohortAnalytics,
);

// The modules a programme runs. They are created and deleted through the
// modules resource; this just lists the programme's own.
router.get(
  "/:uuid/modules",
  validateJWT,
  requireRoles(VIEW_ROLES),
  getCohortModules,
);

// Coaching sessions run under a programme. Business coaches (Mentor) log them
// alongside Staff and Admin, which is who ran them on the Mentorship Tracker.
const COACH_ROLES = ["Admin", "BDA", "Mentor"];

router.get(
  "/:uuid/sessions",
  validateJWT,
  requireRoles([...COACH_ROLES, "Finance"]),
  getCohortSessions,
);
router.post(
  "/:uuid/sessions",
  validateJWT,
  requireRoles(COACH_ROLES),
  createCohortSession,
);
router.delete(
  "/:uuid/sessions/:sessionUuid",
  validateJWT,
  requireRoles(COACH_ROLES),
  deleteCohortSession,
);
router.patch("/:uuid/sessions/:sessionUuid",validateJWT,requireRoles(COACH_ROLES),updateCohortSession);

// Programme reports. "compose" computes a period without saving, so a lead
// can see it before committing; saving freezes those figures onto the report.
// Listed before "/:uuid/reports/:recordUuid" so "compose" is not read as one.
router.get(
  "/:uuid/reports/compose",
  validateJWT,
  requireRoles(DOCUMENT_ROLES),
  composeProgramReport,
);
router.get(
  "/:uuid/reports",
  validateJWT,
  requireRoles(DOCUMENT_ROLES),
  getProgramReports,
);
router.get(
  "/:uuid/reports/:recordUuid",
  validateJWT,
  requireRoles(DOCUMENT_ROLES),
  getProgramReports,
);
router.post(
  "/:uuid/reports",
  validateJWT,
  requireRoles(CALENDAR_ROLES),
  saveProgramReport,
);
router.patch(
  "/:uuid/reports/:recordUuid",
  validateJWT,
  requireRoles(CALENDAR_ROLES),
  saveProgramReport,
);

// What the programme sends its cohort, and what needs the team’s attention.
// Reading either is open to the roles that run or report on the programme;
// sending and raising are narrowed in the controller to the lead.
router.get(
  "/:uuid/announcements",
  validateJWT,
  requireRoles(DOCUMENT_ROLES),
  getProgramAnnouncements,
);
router.post(
  "/:uuid/announcements",
  validateJWT,
  requireRoles(CALENDAR_ROLES),
  sendProgramAnnouncement,
);
router.get(
  "/:uuid/alerts",
  validateJWT,
  requireRoles(DOCUMENT_ROLES),
  programAlerts,
);
router.post(
  "/:uuid/alerts/raise",
  validateJWT,
  requireRoles(CALENDAR_ROLES),
  raiseProgramAlerts,
);

// The programme document library. Uploads are multipart; a recordUuid on the
// POST means "another version of this document" rather than a new one.
router.get(
  "/:uuid/documents",
  validateJWT,
  requireRoles(DOCUMENT_ROLES),
  getProgramDocuments,
);
router.post(
  "/:uuid/documents",
  validateJWT,
  requireRoles(CALENDAR_ROLES),
  documentUpload.single("file"),
  saveProgramDocument,
);
router.post(
  "/:uuid/documents/:recordUuid/versions",
  validateJWT,
  requireRoles(CALENDAR_ROLES),
  documentUpload.single("file"),
  saveProgramDocument,
);
router.patch(
  "/:uuid/documents/:recordUuid",
  validateJWT,
  requireRoles(CALENDAR_ROLES),
  updateProgramDocument,
);
router.delete(
  "/:uuid/documents/:recordUuid",
  validateJWT,
  requireRoles(CALENDAR_ROLES),
  archiveProgramDocument,
);

// Who coaches whom, what they agreed to work on, and how it is going.
router.get(
  "/:uuid/coaching",
  validateJWT,
  requireRoles(COACHING_ROLES),
  getCohortCoaching,
);
router.patch(
  "/:uuid/coaching/:businessUuid",
  validateJWT,
  requireRoles(CALENDAR_ROLES),
  setCohortCoaching,
);

// The implementation calendar: every dated piece of work on the programme.
router.get(
  "/:uuid/calendar",
  validateJWT,
  requireRoles(CALENDAR_ROLES),
  getCohortCalendar,
);
router.post(
  "/:uuid/calendar",
  validateJWT,
  requireRoles(CALENDAR_ROLES),
  saveCohortCalendarEntry,
);
router.patch(
  "/:uuid/calendar/:recordUuid",
  validateJWT,
  requireRoles(CALENDAR_ROLES),
  saveCohortCalendarEntry,
);
router.delete(
  "/:uuid/calendar/:recordUuid",
  validateJWT,
  requireRoles(CALENDAR_ROLES),
  deleteCohortCalendarEntry,
);

// Who runs a programme. Staff can see the leads; only Admin changes them,
// since leading a cohort decides who is answerable for it.
router.get(
  "/:uuid/leads",
  validateJWT,
  requireRoles(VIEW_ROLES),
  getCohortLeads,
);
router.put(
  "/:uuid/leads",
  validateJWT,
  requireRoles(ADMIN_ONLY),
  setCohortLeads,
);

// Per-programme dashboard. Staff and Admin (same audience as the roster).
router.get(
  "/:uuid/dashboard",
  validateJWT,
  requireRoles(VIEW_ROLES),
  getCohortDashboard,
);

// Where one startup stands in the programme.
router.patch(
  "/:uuid/startups/:businessUuid/status",
  validateJWT,
  requireRoles(ROSTER_ROLES),
  setStartupStatus,
);

// Whether that startup is up to date with its reporting.
router.patch(
  "/:uuid/startups/:businessUuid/reporting-status",
  validateJWT,
  requireRoles(ROSTER_ROLES),
  setReportingStatus,
);
router.patch("/:uuid/startups/:businessUuid/participation",validateJWT,requireRoles(ROSTER_ROLES),updateParticipation);

router.get(
  "/:uuid/startups",
  validateJWT,
  requireRoles(VIEW_ROLES),
  getCohortStartups,
);
router.put(
  "/:uuid/startups",
  validateJWT,
  requireRoles(ROSTER_ROLES),
  setCohortStartups,
);

router.patch(
  "/:uuid",
  validateJWT,
  requireRoles(ADMIN_ONLY),
  updateCohortProgram,
);
router.delete(
  "/:uuid",
  validateJWT,
  requireRoles(ADMIN_ONLY),
  deleteCohortProgram,
);

module.exports = router;
