const { Router } = require("express");
const router = Router();

const { validateJWT } = require("../../utils/validateJWT");
const {
  createLog,
  updateLog,
  deleteLog,
  getUserLog,
  getAllLogs,
  getLogDetails,
  getLogsByUserId,
} = require("./log.controller");
const { getPagination } = require("../../utils/getPagination");

router.post("/", validateJWT, createLog);
router.get("/user", validateJWT, getUserLog);
router.get("/user/:user_uuid", getPagination, getLogsByUserId);
router.get("/", validateJWT, getAllLogs);
router.get("/:uuid", validateJWT, getLogDetails);
router.patch("/:uuid", validateJWT, updateLog);
router.delete("/:uuid", validateJWT, deleteLog);

module.exports = router;
