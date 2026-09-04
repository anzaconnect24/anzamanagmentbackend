const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const { requireRoles } = require("../../utils/authorization");
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
  getCohortModules,
  getCohortAnalytics,
} = require("./cohort.controller");

// Staff are stored as either "Staff" or "Reviewer" (see SignUp on the client),
// so both role values must be accepted wherever staff are allowed.
const VIEW_ROLES = ["Admin", "Staff", "Reviewer", "Finance"];
const ROSTER_ROLES = ["Admin", "Staff", "Reviewer"];
const ADMIN_ONLY = ["Admin"];

const router = Router();

// Public: the sign-up form needs the programme list before an account exists.
router.get("/public", getPublicCohortPrograms);

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
const COACH_ROLES = ["Admin", "Staff", "Reviewer", "Mentor"];

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
