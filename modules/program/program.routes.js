const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  createProgram,
  updateProgram,
  deleteProgram,
  getAllPrograms,
  getProgramDetails,
} = require("./program.controller");

const router = Router();
router.post("/", validateJWT, createProgram);
router.get("/", validateJWT, getAllPrograms);
router.get("/:uuid", validateJWT, getProgramDetails);
router.patch("/:uuid", validateJWT, updateProgram);
router.delete("/:uuid", validateJWT, deleteProgram);

module.exports = router;
