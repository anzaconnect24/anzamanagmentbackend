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

const router = Router();

// Monitoring & Evaluation, scoped to one cohort programme throughout.
//
// The platform has no separate "M&E Manager" role, so the spec's roles map on
// to the ones that exist: Admin, Staff and Reviewer configure the framework
// and verify data (M&E Manager / Programme Manager); Finance and Mentor read
// it (Executive / Business Coach). Enterprise users reach their own results
// through the enterprise endpoints, never these.
const ME_MANAGERS = ["Admin", "Staff", "Reviewer"];
const ME_VIEWERS = ["Admin", "Staff", "Reviewer", "Finance", "Mentor"];

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

module.exports = router;
