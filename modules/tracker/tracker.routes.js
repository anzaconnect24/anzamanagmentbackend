const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const { requireRoles } = require("../../utils/authorization");
const {
  getMentorOverview,
  listMentorWeeklyLogs,
  createWeeklyLog,
  createMilestone,
  listMilestones,
  submitMilestone,
  reviewMilestone,
  getAdminOverview,
  listAdminWeeklyLogs,
  listAdminMilestones,
  exportAdminTrackerCsv,
} = require("./tracker.controllers");

const router = Router();

router.get(
  "/mentor/overview",
  validateJWT,
  requireRoles(["Mentor", "Admin"]),
  getMentorOverview,
);
router.get(
  "/mentor/weekly-logs",
  validateJWT,
  requireRoles(["Mentor", "Admin"]),
  listMentorWeeklyLogs,
);
router.post(
  "/mentor/weekly-logs",
  validateJWT,
  requireRoles(["Mentor"]),
  createWeeklyLog,
);

router.post(
  "/milestones",
  validateJWT,
  requireRoles(["Mentor"]),
  createMilestone,
);
router.get(
  "/milestones",
  validateJWT,
  requireRoles(["Mentor", "Enterprenuer", "Admin"]),
  listMilestones,
);
router.patch(
  "/milestones/:uuid/submit",
  validateJWT,
  requireRoles(["Enterprenuer"]),
  submitMilestone,
);
router.patch(
  "/milestones/:uuid/review",
  validateJWT,
  requireRoles(["Mentor", "Admin"]),
  reviewMilestone,
);

router.get(
  "/admin/overview",
  validateJWT,
  requireRoles(["Admin"]),
  getAdminOverview,
);
router.get(
  "/admin/weekly-logs",
  validateJWT,
  requireRoles(["Admin"]),
  listAdminWeeklyLogs,
);
router.get(
  "/admin/milestones",
  validateJWT,
  requireRoles(["Admin"]),
  listAdminMilestones,
);
router.get(
  "/admin/export-csv",
  validateJWT,
  requireRoles(["Admin"]),
  exportAdminTrackerCsv,
);

module.exports = router;
