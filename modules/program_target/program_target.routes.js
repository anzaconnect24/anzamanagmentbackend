const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const { requireRoles } = require("../../utils/authorization");
const {
  getProgramTargets,
  createTarget,
  updateTarget,
  removeTarget,
  reviewSubmission,
  getMyTargets,
  saveMySubmissions,
} = require("./program_target.controller");

const router = Router();

// Staff who may open a programme's targets. The controller narrows setting and
// reviewing to Admin, every BDA and the programme's own lead.
const STAFF = ["Admin", "BDA", "ME", "Finance", "Mentor"];

router.get("/mine", validateJWT, requireRoles(["Enterprenuer"]), getMyTargets);
router.put("/:uuid/mine", validateJWT, requireRoles(["Enterprenuer"]), saveMySubmissions);

router.get("/:uuid", validateJWT, requireRoles(STAFF), getProgramTargets);
router.post("/:uuid/targets", validateJWT, requireRoles(STAFF), createTarget);
router.patch("/:uuid/targets/:targetUuid", validateJWT, requireRoles(STAFF), updateTarget);
router.delete("/:uuid/targets/:targetUuid", validateJWT, requireRoles(STAFF), removeTarget);
router.patch(
  "/:uuid/submissions/:submissionUuid/review",
  validateJWT,
  requireRoles(STAFF),
  reviewSubmission,
);

module.exports = router;
