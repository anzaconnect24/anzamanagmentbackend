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
  getAudiences,
} = require("./survey.controller");

const router = Router();

// Surveys. The M&E Officer is the only role that writes them - they are an M&E
// instrument. A survey goes to one programme's startups, to every startup on
// the platform, or to people chosen by name, and whoever it is addressed to
// answers it once. Who may open or answer a survey is decided in the
// controller, in one place, from the survey's audience.
//
// Must stay in step with AUTHOR_ROLES in survey.controller.js.
const AUTHORS = ["ME"];

// Listing and opening are shared: what comes back depends on who is asking.
router.get("/", validateJWT, getSurveys);

// The people a survey can be sent to by name. Before "/:uuid", or "audiences"
// would be read as a survey's uuid.
router.get("/audiences", validateJWT, requireRoles(AUTHORS), getAudiences);

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

// Someone a survey is addressed to submitting their answers.
router.post("/:uuid/responses", validateJWT, submitResponse);

module.exports = router;
