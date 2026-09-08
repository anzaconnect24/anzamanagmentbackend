const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const { requireRoles } = require("../../utils/authorization");
const {
  getCourses,
  getNewCourseCount,
  getCourse,
  createCourse,
  updateCourse,
  archiveCourse,
  deleteCourse,
  reorderCourses,
  enroll,
  setEnrollments,
  getCourseEnrollments,
} = require("./course.controller");

const router = Router();

// Courses inside a programme. Startups enrol in a course; its modules,
// workshops and resources hang off it.
const AUTHORS = ["Admin", "Staff", "Reviewer"];
const STAFF_VIEWERS = ["Admin", "Staff", "Reviewer", "Finance", "Mentor"];

// Listing is shared: staff see every course on the programme including
// drafts, a learner sees the published ones on their own programme. Passing
// "mine" as the programme lets a learner ask without knowing its uuid.
router.get("/programs/:uuid/courses", validateJWT, getCourses);
router.post(
  "/programs/:uuid/courses",
  validateJWT,
  requireRoles(AUTHORS),
  createCourse,
);
router.put(
  "/programs/:uuid/courses/order",
  validateJWT,
  requireRoles(AUTHORS),
  reorderCourses,
);

// How many courses on the learner's programme they have not taken up yet.
// Listed before "/courses/:courseUuid" so "new" is not read as a uuid.
router.get("/courses/new/count", validateJWT, getNewCourseCount);

router.get("/courses/:courseUuid", validateJWT, getCourse);
router.patch(
  "/courses/:courseUuid",
  validateJWT,
  requireRoles(AUTHORS),
  updateCourse,
);
// Archiving hides the course but keeps its content, enrolments and the
// progress learners built up against it. This is the safe default.
router.delete(
  "/courses/:courseUuid",
  validateJWT,
  requireRoles(AUTHORS),
  archiveCourse,
);

// Deleting destroys the course and everything under it — modules, content,
// learner progress, workshops, attendance, recordings, resources and
// enrolments — in one transaction. Admin only, and a separate path so it can
// never be reached by mistake from the archive button.
router.delete(
  "/courses/:courseUuid/permanent",
  validateJWT,
  requireRoles(["Admin"]),
  deleteCourse,
);

// A startup enrolling itself, where the course allows it.
router.post("/courses/:courseUuid/enroll", validateJWT, enroll);

router.get(
  "/courses/:courseUuid/enrollments",
  validateJWT,
  requireRoles(STAFF_VIEWERS),
  getCourseEnrollments,
);
router.put(
  "/courses/:courseUuid/enrollments",
  validateJWT,
  requireRoles(AUTHORS),
  setEnrollments,
);

module.exports = router;
