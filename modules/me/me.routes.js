const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const { requireRoles } = require("../../utils/authorization");
const {
  getOverview,
  getFramework,
  updateFramework,
  createResult,
  updateResult,
  archiveResult,
  getCatalogue,
  getIndicators,
  createIndicator,
  updateIndicator,
  archiveIndicator,
  submitIndicatorValue,
  getIndicatorHistory,
} = require("./me.controller");
const operations = require("./me.operations.controller");
const delivery = require("./me.delivery.controller");
const upload = require("../../utils/me_upload");
const {CohortProgram,CohortProgramLead,CohortMembership,Business}=require("../../models");

const router = Router();

// Monitoring & Evaluation, scoped to one cohort programme throughout.
//
// The M&E Officer ("ME") owns Monitoring & Evaluation outright: they configure
// the framework and verify data. Finance and Mentor read it (Executive /
// Business Coach). Neither Staff nor Admin have any M&E access - it moved off
// Staff onto the M&E Officer, and Admin oversight was removed after that.
// Enterprise users reach their own results through the enterprise endpoints,
// never these.
const ME_MANAGERS = ["ME"];
const ME_VIEWERS = ["ME", "Finance", "Mentor"];

// The M&E Officer monitors the whole portfolio, so they are not restricted to
// the programmes they are assigned to lead.
const PORTFOLIO_ROLES = ["ME"];

const programAccess=async(req,res,next)=>{try{const program=await CohortProgram.findOne({where:{uuid:req.params.uuid,archivedAt:null}});if(!program)return res.status(404).json({status:false,message:"Program not found"});if(PORTFOLIO_ROLES.includes(req.user.role)||req.user.role==="BDA")return next();if(req.user.role==="Enterprenuer"){const business=await Business.findOne({where:{userId:req.user.id}}),member=business&&await CohortMembership.findOne({where:{cohortProgramId:program.id,businessId:business.id}});return member?next():res.status(403).json({status:false,message:"You are not enrolled in this program"});}const lead=await CohortProgramLead.findOne({where:{cohortProgramId:program.id,userId:req.user.id}});return lead?next():res.status(403).json({status:false,message:"You are not assigned to this program"});}catch(error){next(error);}};
router.use("/:uuid([0-9a-fA-F-]{36})",validateJWT,programAccess);

router.get("/portfolio/dashboard",validateJWT,requireRoles(PORTFOLIO_ROLES),operations.portfolioDashboard);

// The enumerations and source catalogue the indicator form renders from.
router.get("/catalogue", validateJWT, requireRoles(ME_VIEWERS), getCatalogue);

router.get(
  "/:uuid/overview",
  validateJWT,
  requireRoles(ME_VIEWERS),
  getOverview,
);

router.get(
  "/:uuid/framework",
  validateJWT,
  requireRoles(ME_VIEWERS),
  getFramework,
);
router.patch(
  "/:uuid/framework",
  validateJWT,
  requireRoles(ME_MANAGERS),
  updateFramework,
);

router.post(
  "/:uuid/results",
  validateJWT,
  requireRoles(ME_MANAGERS),
  createResult,
);
router.patch(
  "/:uuid/results/:resultUuid",
  validateJWT,
  requireRoles(ME_MANAGERS),
  updateResult,
);
// Archive, not delete — see the controller.
router.delete(
  "/:uuid/results/:resultUuid",
  validateJWT,
  requireRoles(ME_MANAGERS),
  archiveResult,
);

router.get(
  "/:uuid/indicators",
  validateJWT,
  requireRoles(ME_VIEWERS),
  getIndicators,
);
router.post(
  "/:uuid/indicators",
  validateJWT,
  requireRoles(ME_MANAGERS),
  createIndicator,
);
router.patch(
  "/:uuid/indicators/:indicatorUuid",
  validateJWT,
  requireRoles(ME_MANAGERS),
  updateIndicator,
);
router.delete(
  "/:uuid/indicators/:indicatorUuid",
  validateJWT,
  requireRoles(ME_MANAGERS),
  archiveIndicator,
);

router.get(
  "/:uuid/indicators/:indicatorUuid/history",
  validateJWT,
  requireRoles(ME_VIEWERS),
  getIndicatorHistory,
);
router.post(
  "/:uuid/indicators/:indicatorUuid/values",
  validateJWT,
  requireRoles(ME_MANAGERS),
  submitIndicatorValue,
);

// Operational M&E records. Controllers additionally enforce programme
// membership and entrepreneur ownership; route roles are the outer boundary.
router.get("/:uuid/operations/dashboard", validateJWT, requireRoles(ME_VIEWERS), operations.dashboardV2);
router.get("/:uuid/my-dashboard",validateJWT,requireRoles(["Enterprenuer"]),operations.entrepreneurDashboard);
router.get("/:uuid/data-quality",validateJWT,requireRoles(ME_VIEWERS),operations.listDataQuality);
router.get("/:uuid/mentorship",validateJWT,requireRoles([...ME_VIEWERS,"Enterprenuer"]),operations.mentorshipSummary);
router.patch("/:uuid/data-quality/:recordUuid/resolve",validateJWT,requireRoles(ME_MANAGERS),operations.resolveDataQuality);
router.get("/:uuid/reports", validateJWT, requireRoles([...ME_MANAGERS, "Enterprenuer"]), operations.listReports);
router.post("/:uuid/reports", validateJWT, requireRoles([...ME_MANAGERS, "Enterprenuer"]), operations.saveReport);
router.post("/:uuid/reports/:recordUuid/submit", validateJWT, requireRoles([...ME_MANAGERS, "Enterprenuer"]), operations.submitReport);
router.patch("/:uuid/reports/:recordUuid/review", validateJWT, requireRoles(ME_MANAGERS), operations.reviewReport);
router.get("/:uuid/assessments", validateJWT, requireRoles([...ME_VIEWERS, "Enterprenuer"]), operations.listAssessments);
router.get("/:uuid/assessment-templates",validateJWT,requireRoles([...ME_VIEWERS,"Enterprenuer"]),operations.listAssessmentTemplates);
router.post("/:uuid/assessment-templates",validateJWT,requireRoles(ME_MANAGERS),operations.saveAssessmentTemplate);
router.post("/:uuid/assessments", validateJWT, requireRoles([...ME_MANAGERS, "Enterprenuer"]), operations.saveAssessment);
router.patch("/:uuid/assessments/:recordUuid/review",validateJWT,requireRoles(ME_MANAGERS),operations.reviewAssessment);
router.get("/:uuid/assessments/compare", validateJWT, requireRoles([...ME_VIEWERS, "Enterprenuer"]), operations.compareAssessments);
router.get("/:uuid/metrics", validateJWT, requireRoles([...ME_VIEWERS, "Enterprenuer"]), operations.metrics);
router.get("/:uuid/evidence", validateJWT, requireRoles([...ME_VIEWERS, "Enterprenuer"]), operations.listEvidence);
router.post("/:uuid/evidence", validateJWT, requireRoles(ME_MANAGERS), operations.addEvidence);
router.post("/:uuid/evidence/upload",validateJWT,requireRoles([...ME_MANAGERS,"Enterprenuer"]),upload.single("file"),operations.uploadEvidence);
router.get("/:uuid/evidence/:recordUuid/file",validateJWT,requireRoles([...ME_VIEWERS,"Enterprenuer"]),operations.downloadEvidence);
router.patch("/:uuid/evidence/:recordUuid/review",validateJWT,requireRoles(ME_MANAGERS),operations.reviewEvidence);
router.get("/:uuid/export",validateJWT,requireRoles(ME_MANAGERS),operations.exportData);
const PARTICIPANTS=[...ME_VIEWERS,"Enterprenuer"];
router.get("/:uuid/activities",validateJWT,requireRoles(PARTICIPANTS),delivery.listActivities);
router.post("/:uuid/activities",validateJWT,requireRoles(ME_MANAGERS),delivery.saveActivity);
router.patch("/:uuid/activities/:recordUuid",validateJWT,requireRoles(ME_MANAGERS),delivery.saveActivity);
router.put("/:uuid/activities/:activityUuid/attendance",validateJWT,requireRoles(PARTICIPANTS),delivery.saveAttendance);
for(const [path,h] of [["goals",delivery.goals],["funding",delivery.funding],["employment",delivery.employment],["impact",delivery.impact]]){router.get(`/:uuid/${path}`,validateJWT,requireRoles(PARTICIPANTS),h.list);router.post(`/:uuid/${path}`,validateJWT,requireRoles(PARTICIPANTS),h.save);router.patch(`/:uuid/${path}/:recordUuid`,validateJWT,requireRoles(PARTICIPANTS),h.save);}
router.post("/:uuid/goals/:goalUuid/milestones",validateJWT,requireRoles(PARTICIPANTS),delivery.addMilestone);
router.patch("/:uuid/goals/:goalUuid/milestones/:milestoneUuid",validateJWT,requireRoles(PARTICIPANTS),delivery.addMilestone);
router.get("/:uuid/risks",validateJWT,requireRoles(ME_VIEWERS),delivery.risks);
router.patch("/:uuid/risks/:recordUuid",validateJWT,requireRoles(ME_MANAGERS),delivery.reviewRisk);
router.post("/:uuid/risks/refresh",validateJWT,requireRoles(ME_MANAGERS),delivery.refreshRisks);
router.post("/:uuid/reminders/generate",validateJWT,requireRoles(ME_MANAGERS),delivery.generateReminders);
router.get("/reminders/mine",validateJWT,delivery.reminders);
router.patch("/reminders/:recordUuid/read",validateJWT,delivery.readReminder);

module.exports = router;
