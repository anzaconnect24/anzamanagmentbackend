const { Router } = require("express");
const router = Router();

const { validateJWT } = require("../../utils/validateJWT");
const {
  createInvestmentOpportunity,
  updateInvestmentOpportunity,
  deleteInvestmentOpportunity,
  getInvestmentOpportunityDetails,
  getAllInvestmentOpportunities,
} = require("./investmentOpportunities.controllers");
const { getPagination } = require("../../utils/getPagination");

router.post("/", validateJWT, createInvestmentOpportunity);
router.get("/", validateJWT, getPagination, getAllInvestmentOpportunities);
router.get("/:uuid", validateJWT, getInvestmentOpportunityDetails);
router.patch("/:uuid", validateJWT, updateInvestmentOpportunity);
router.delete("/:uuid", validateJWT, deleteInvestmentOpportunity);

module.exports = router;
