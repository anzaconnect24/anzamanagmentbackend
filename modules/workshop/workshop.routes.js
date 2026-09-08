const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const { requireRoles } = require("../../utils/authorization");
const {
  getWorkshops,
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
  getAttendance,
  recordAttendance,
  joinWorkshop,
  addRecording,
  publishRecording,
  deleteRecording,
  getEnrollments,
  updateEnrollment,
  getResources,
  createResource,
  archiveResource,
} = require("./workshop.controller");

const router = Router();

// Workshops, learning enrolments and the resource library, all scoped to one
// programme. Staff run them; learners read them and join.
const AUTHORS = ["Admin", "Staff", "Reviewer"];
const STAFF_VIEWERS = ["Admin", "Staff", "Reviewer", "Finance", "Mentor"];

// --- workshops -----------------------------------------------------------
// Listing is open to learners: they need to see what is coming and join it.
router.get("/programs/:uuid/workshops", validateJWT, getWorkshops);
router.post(
  "/programs/:uuid/workshops",
  validateJWT,
  requireRoles(AUTHORS),
  createWorkshop,
);
router.patch(
  "/workshops/:workshopUuid",
  validateJWT,
  requireRoles(AUTHORS),
  updateWorkshop,
);
router.delete(
  "/workshops/:workshopUuid",
  validateJWT,
  requireRoles(AUTHORS),
  deleteWorkshop,
);

// --- attendance ----------------------------------------------------------
router.get(
  "/workshops/:workshopUuid/attendance",
  validateJWT,
  requireRoles(STAFF_VIEWERS),
  getAttendance,
);
router.put(
  "/workshops/:workshopUuid/attendance",
  validateJWT,
  requireRoles(AUTHORS),
  recordAttendance,
);
// A learner opening the meeting link, which also marks them as joined.
router.post("/workshops/:workshopUuid/join", validateJWT, joinWorkshop);

// --- recordings ----------------------------------------------------------
router.post(
  "/workshops/:workshopUuid/recordings",
  validateJWT,
  requireRoles(AUTHORS),
  addRecording,
);
// Publish a recording into a lesson, reusing the same media.
router.post(
  "/recordings/:recordingUuid/publish",
  validateJWT,
  requireRoles(AUTHORS),
  publishRecording,
);
router.delete(
  "/recordings/:recordingUuid",
  validateJWT,
  requireRoles(AUTHORS),
  deleteRecording,
);

// --- enrolments ----------------------------------------------------------
router.get(
  "/programs/:uuid/enrollments",
  validateJWT,
  requireRoles(STAFF_VIEWERS),
  getEnrollments,
);
router.patch(
  "/enrollments/:enrollmentUuid",
  validateJWT,
  requireRoles(AUTHORS),
  updateEnrollment,
);

// --- resources -----------------------------------------------------------
router.get("/programs/:uuid/resources", validateJWT, getResources);
router.post(
  "/programs/:uuid/resources",
  validateJWT,
  requireRoles(AUTHORS),
  createResource,
);
router.delete(
  "/resources/:resourceUuid",
  validateJWT,
  requireRoles(AUTHORS),
  archiveResource,
);

module.exports = router;
