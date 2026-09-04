const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  createModule,
  updateModule,
  deleteModule,
  getModules,
  getModule,
  getModuleOverview,
} = require("./modules.controller");
const { getPagination } = require("../../utils/getPagination");
const { requireRoles } = require("../../utils/authorization");

// Course content is authored by staff. Learners read it but must not be able
// to write to it — these routes were previously open to any signed-in user.
const AUTHORS = ["Admin", "Staff", "Reviewer"];

const router = Router();
router.post("/", validateJWT, requireRoles(AUTHORS), createModule);
router.get("/", validateJWT, getPagination, getModules);
// The staff record of one module. Listed before "/:uuid" is irrelevant
// (different depth), but it belongs with the module it describes.
router.get(
  "/:uuid/overview",
  validateJWT,
  requireRoles(["Admin", "Staff", "Reviewer", "Finance"]),
  getModuleOverview,
);
router.get("/:uuid", validateJWT, getPagination, getModule);
router.patch("/:uuid", validateJWT, requireRoles(AUTHORS), updateModule);
router.delete("/:uuid", validateJWT, requireRoles(AUTHORS), deleteModule);

module.exports = router;
