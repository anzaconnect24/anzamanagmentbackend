const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const { requireRoles } = require("../../utils/authorization");
const {
  getMentorOverview,
  listMentorEnterprises,
  upsertMentorEnterprise,
  updateMentorEnterprise,
  deleteMentorEnterprise,
  getMentorEnterpriseDetails,
  getEntrepreneurTrackerDashboard,
  getTrackerProgramOverview,
  updateEntrepreneurEnterprise,
  updateMentorEnterpriseTrancheStages,
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
  requireRoles(["Mentor", "Staff", "Reviewer", "Admin", "Finance"]),
  getMentorOverview,
);
router.get(
  "/entrepreneur/dashboard",
  validateJWT,
  requireRoles(["Enterprenuer"]),
  getEntrepreneurTrackerDashboard,
);
router.get(
  "/mentor/weekly-logs",
  validateJWT,
  requireRoles(["Mentor", "Staff", "Reviewer", "Admin", "Finance"]),
  listMentorWeeklyLogs,
);
router.post(
  "/mentor/weekly-logs",
  validateJWT,
  requireRoles(["Mentor", "Staff", "Reviewer"]),
  createWeeklyLog,
);

router.get(
  "/programs/:programUuid/overview",
  validateJWT,
  requireRoles(["Mentor", "Staff", "Reviewer", "Admin", "Finance"]),
  getTrackerProgramOverview,
);

router.get(
  "/enterprises",
  validateJWT,
  requireRoles(["Mentor", "Staff", "Reviewer", "Admin", "Finance"]),
  listMentorEnterprises,
);
router.post(
  "/enterprises",
  validateJWT,
  requireRoles(["Mentor", "Staff", "Reviewer", "Admin", "Finance"]),
  upsertMentorEnterprise,
);
router.patch(
  "/enterprises/:uuid",
  validateJWT,
  requireRoles(["Mentor", "Staff", "Reviewer", "Admin", "Finance"]),
  updateMentorEnterprise,
);
router.delete(
  "/enterprises/:uuid",
  validateJWT,
  requireRoles(["Mentor", "Staff", "Reviewer", "Admin", "Finance"]),
  deleteMentorEnterprise,
);
router.get(
  "/enterprises/:uuid",
  validateJWT,
  requireRoles(["Mentor", "Staff", "Reviewer", "Admin", "Finance"]),
  getMentorEnterpriseDetails,
);
router.patch(
  "/enterprises/:uuid/tranche-stages",
  validateJWT,
  requireRoles(["Mentor", "Staff", "Reviewer", "Admin", "Finance"]),
  updateMentorEnterpriseTrancheStages,
);
router.patch(
  "/enterprises/:uuid/kpis",
  validateJWT,
  requireRoles(["Mentor", "Staff", "Reviewer", "Admin", "Finance"]),
  updateMentorEnterpriseKpis,
);
router.post(
  "/enterprises/:uuid/sessions",
  validateJWT,
  requireRoles(["Mentor", "Staff", "Reviewer"]),
  createMentorEnterpriseSession,
);
router.post(
  "/enterprises/:uuid/weekly-logs",
  validateJWT,
  requireRoles(["Mentor", "Staff", "Reviewer"]),
  createEnterpriseWeeklyLog,
);
router.post(
  "/enterprises/:uuid/milestones",
  validateJWT,
  requireRoles(["Mentor", "Staff", "Reviewer"]),
  createEnterpriseMilestone,
);

router.patch(
  "/entrepreneur/enterprise",
  validateJWT,
  requireRoles(["Enterprenuer"]),
  updateEntrepreneurEnterprise,
);

router.post(
  "/milestones",
  validateJWT,
  requireRoles(["Mentor", "Enterprenuer"]),
  createMilestone,
);
router.get(
  "/milestones",
  validateJWT,
  requireRoles([
    "Mentor",
    "Staff",
    "Reviewer",
    "Enterprenuer",
    "Admin",
    "Finance",
  ]),
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
  requireRoles(["Mentor", "Staff", "Reviewer", "Admin", "Finance"]),
  reviewMilestone,
);

router.get(
  "/admin/overview",
  validateJWT,
  requireRoles(["Admin", "Finance"]),
  getAdminOverview,
);
router.get(
  "/admin/businesses",
  validateJWT,
  requireRoles(["Admin", "Finance"]),
  listAdminBusinesses,
);
router.get(
  "/admin/weekly-logs",
  validateJWT,
  requireRoles(["Admin", "Finance"]),
  listAdminWeeklyLogs,
);
router.get(
  "/admin/milestones",
  validateJWT,
  requireRoles(["Admin", "Finance"]),
  listAdminMilestones,
);
router.get(
  "/admin/export-csv",
  validateJWT,
  requireRoles(["Admin", "Finance"]),
  exportAdminTrackerCsv,
);

module.exports = router;
