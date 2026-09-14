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
  updateEnterpriseBudgetDocument,
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
  reviseMilestone,
} = require("./tracker.controllers");

const router = Router();

router.get(
  "/mentor/overview",
  validateJWT,
  requireRoles(["Mentor", "BDA", "Admin", "Finance"]),
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
  requireRoles(["Mentor", "BDA", "Admin", "Finance"]),
  listMentorWeeklyLogs,
);
router.post(
  "/mentor/weekly-logs",
  validateJWT,
  requireRoles(["Mentor", "BDA"]),
  createWeeklyLog,
);

router.get(
  "/programs/:programUuid/overview",
  validateJWT,
  requireRoles(["Mentor", "BDA", "Admin", "Finance"]),
  getTrackerProgramOverview,
);

router.get(
  "/enterprises",
  validateJWT,
  requireRoles(["Mentor", "BDA", "Admin", "Finance"]),
  listMentorEnterprises,
);
router.post(
  "/enterprises",
  validateJWT,
  requireRoles(["Mentor", "BDA", "Admin", "Finance"]),
  upsertMentorEnterprise,
);
router.patch(
  "/enterprises/:uuid",
  validateJWT,
  requireRoles(["Mentor", "BDA", "Admin", "Finance"]),
  updateMentorEnterprise,
);
router.delete(
  "/enterprises/:uuid",
  validateJWT,
  requireRoles(["Mentor", "BDA", "Admin", "Finance"]),
  deleteMentorEnterprise,
);
router.get(
  "/enterprises/:uuid",
  validateJWT,
  // The M&E Officer reads a recipient's grant workspace from a programme's
  // grants page; every change they could make stays behind the other routes.
  requireRoles(["Mentor", "BDA", "Admin", "Finance", "ME"]),
  getMentorEnterpriseDetails,
);
router.patch(
  "/enterprises/:uuid/tranche-stages",
  validateJWT,
  requireRoles(["Mentor", "BDA", "Admin", "Finance"]),
  updateMentorEnterpriseTrancheStages,
);
router.patch(
  "/enterprises/:uuid/kpis",
  validateJWT,
  requireRoles(["Mentor", "BDA", "Admin", "Finance", "Enterprenuer"]),
  updateMentorEnterpriseKpis,
);
router.patch(
  "/enterprises/:uuid/budget-document",
  validateJWT,
  requireRoles(["Mentor", "BDA", "Admin", "Finance", "Enterprenuer"]),
  updateEnterpriseBudgetDocument,
);
router.post(
  "/enterprises/:uuid/sessions",
  validateJWT,
  requireRoles(["Mentor", "BDA"]),
  createMentorEnterpriseSession,
);
router.post(
  "/enterprises/:uuid/weekly-logs",
  validateJWT,
  requireRoles(["Mentor", "BDA"]),
  createEnterpriseWeeklyLog,
);
router.post(
  "/enterprises/:uuid/milestones",
  validateJWT,
  requireRoles(["Mentor", "BDA"]),
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
    "BDA",
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
  "/milestones/:uuid",
  validateJWT,
  requireRoles(["Enterprenuer"]),
  reviseMilestone,
);
router.patch(
  "/milestones/:uuid/review",
  validateJWT,
  requireRoles(["Mentor", "BDA", "Admin", "Finance"]),
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
