const { Router } = require("express");
const { getMentorOverviewStats } = require("./stats.controllers");
const { validateJWT } = require("../../utils/validateJWT");

const router = Router();
router.get("/mentor", validateJWT, getMentorOverviewStats);

module.exports = router;
