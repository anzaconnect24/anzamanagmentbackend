const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  requireProgramCreator,
  requireProgramManager,
  requireProgramDeleter,
} = require("./program.authorization");
const {
  createProgram,
  updateProgram,
  deleteProgram,
  getAllPrograms,
  getProgramDetails,
  getCourseCompletion,
  completeCourse,
  uncompleteCourse,
} = require("./program.controller");

const router = Router();

// Learn-and-grow courses, Grant Management and the Mentorship Tracker. The
// programmes startups enrol in live under /cohort-programs and have their own
// tables — nothing here touches them.
//
// Who may write depends on which kind of program it is: see
// program.authorization.js.
router.post("/", validateJWT, requireProgramCreator, createProgram);
router.get("/", validateJWT, getAllPrograms);
// A startup marking a class finished. Listed before "/:uuid" is irrelevant
// (different depth), but these belong to the class they act on.
router.get("/:uuid/completion", validateJWT, getCourseCompletion);
router.post("/:uuid/completion", validateJWT, completeCourse);
router.delete("/:uuid/completion", validateJWT, uncompleteCourse);

router.get("/:uuid", validateJWT, getProgramDetails);
router.patch("/:uuid", validateJWT, requireProgramManager, updateProgram);
router.delete("/:uuid", validateJWT, requireProgramDeleter, deleteProgram);

module.exports = router;
