const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  createInvestmentApplication,
  getInvestmentApplication,
  getAllInvestmentApplications,
  deleteInvestmentApplication,
  updateInvestmentApplication,
} = require("./investmentApplications.controllers");
const { getPagination } = require("../../utils/getPagination");

const router = Router();
router.post("/", validateJWT, createInvestmentApplication);
router.get("/:uuid", validateJWT, getInvestmentApplication);
router.get("/", validateJWT, getPagination, getAllInvestmentApplications);
router.patch("/:uuid", validateJWT, updateInvestmentApplication);
router.delete("/:uuid", validateJWT, deleteInvestmentApplication);

module.exports = router;
