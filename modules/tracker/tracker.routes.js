const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const { requireRoles } = require("../../utils/authorization");
const {
  getMentorOverview,
  listMentorEnterprises,
  upsertMentorEnterprise,
  getMentorEnterpriseDetails,
  updateMentorEnterpriseKpis,
  createMentorEnterpriseSession,
  createEnterpriseWeeklyLog,
  createEnterpriseMilestone,
  listMentorWeeklyLogs,
  createWeeklyLog,
  createMilestone,
  listMilestones,
  submitMilestone,
  reviewMilestone,
  getAdminOverview,
  listAdminBusinesses,
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

router.get(
  "/enterprises",
  validateJWT,
  requireRoles(["Mentor", "Admin"]),
  listMentorEnterprises,
);
router.post(
  "/enterprises",
  validateJWT,
  requireRoles(["Mentor"]),
  upsertMentorEnterprise,
);
router.get(
  "/enterprises/:uuid",
  validateJWT,
  requireRoles(["Mentor", "Admin"]),
  getMentorEnterpriseDetails,
);
router.patch(
  "/enterprises/:uuid/kpis",
  validateJWT,
  requireRoles(["Mentor"]),
  updateMentorEnterpriseKpis,
);
router.post(
  "/enterprises/:uuid/sessions",
  validateJWT,
  requireRoles(["Mentor"]),
  createMentorEnterpriseSession,
);
router.post(
  "/enterprises/:uuid/weekly-logs",
  validateJWT,
  requireRoles(["Mentor"]),
  createEnterpriseWeeklyLog,
);
router.post(
  "/enterprises/:uuid/milestones",
  validateJWT,
  requireRoles(["Mentor"]),
  createEnterpriseMilestone,
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
  "/admin/businesses",
  validateJWT,
  requireRoles(["Admin"]),
  listAdminBusinesses,
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
