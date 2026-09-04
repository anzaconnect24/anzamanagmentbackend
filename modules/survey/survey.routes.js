const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const { requireRoles } = require("../../utils/authorization");
const {
  getSurveys,
  getSurvey,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  setSurveyStatus,
  submitResponse,
  getSurveyResults,
} = require("./survey.controller");

const router = Router();

// Surveys a programme runs. Staff write them; the startups on the programme
// answer the published ones. Both sides are checked in the controller against
// the caller's own programme, so a startup cannot reach another's survey.
const AUTHORS = ["Admin", "Staff", "Reviewer", "Finance"];

// Listing and opening are shared: what comes back depends on the role.
router.get("/", validateJWT, getSurveys);
router.get("/:uuid", validateJWT, getSurvey);

router.post("/", validateJWT, requireRoles(AUTHORS), createSurvey);
router.patch("/:uuid", validateJWT, requireRoles(AUTHORS), updateSurvey);
router.delete("/:uuid", validateJWT, requireRoles(AUTHORS), deleteSurvey);
router.patch(
  "/:uuid/status",
  validateJWT,
  requireRoles(AUTHORS),
  setSurveyStatus,
);

router.get(
  "/:uuid/results",
  validateJWT,
  requireRoles(AUTHORS),
  getSurveyResults,
);

// A startup submitting its answers.
router.post("/:uuid/responses", validateJWT, submitResponse);

module.exports = router;
