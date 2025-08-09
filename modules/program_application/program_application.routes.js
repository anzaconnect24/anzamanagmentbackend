const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  createProgramApplication,
  updateProgramApplication,
  deleteProgramApplication,
  getProgramApplication,
  getAllProgramApplications,
} = require("./program_application.controller");
const { getPagination } = require("../../utils/getPagination");
const router = Router();
router.post("/", validateJWT, createProgramApplication);
router.get("/", validateJWT, getPagination, getAllProgramApplications);
router.get("/:uuid", validateJWT, getProgramApplication);
router.patch("/:uuid", validateJWT, updateProgramApplication);
router.delete("/:uuid", validateJWT, deleteProgramApplication);

module.exports = router;
