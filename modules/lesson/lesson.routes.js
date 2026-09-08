const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const { requireRoles } = require("../../utils/authorization");
const {
  getCourseOutline,
  getModuleContent,
  reorderContent,
  recordProgress,
  getProgrammeProgress,
} = require("./lesson.controller");

const router = Router();

// Learning content: Course -> Module -> Slides. A module holds its slides
// directly, so there is no lesson resource here any more.
const AUTHORS = ["Admin", "Staff", "Reviewer"];
const STAFF_VIEWERS = ["Admin", "Staff", "Reviewer", "Finance", "Mentor"];

// The outline of a course, with the caller's own progress. The uuid may name
// a course, a programme, or "mine" for the learner's own programme.
router.get("/courses/:uuid/outline", validateJWT, getCourseOutline);

// How far every enterprise on a programme has got.
router.get(
  "/courses/:uuid/progress",
  validateJWT,
  requireRoles(STAFF_VIEWERS),
  getProgrammeProgress,
);

router.get("/modules/:moduleUuid/content", validateJWT, getModuleContent);
router.put(
  "/modules/:moduleUuid/content/order",
  validateJWT,
  requireRoles(AUTHORS),
  reorderContent,
);

// A learner reporting how far through a slide they got. Open to any signed-in
// user: it only ever writes their own progress.
router.post("/content/:contentUuid/progress", validateJWT, recordProgress);

module.exports = router;
