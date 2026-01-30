const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  createInvestmentApplication,
  getInvestmentApplication,
  getAllInvestmentApplications,
  deleteInvestmentApplication,
  updateInvestmentApplication,
  investorShowInterest,
  investorApproveApplication,
  investorRejectApplication,
  markInvestmentCompleted,
  getInterestedEntrepreneurs,
} = require("./investmentApplications.controllers");
const { getPagination } = require("../../utils/getPagination");

const router = Router();
router.post("/", validateJWT, createInvestmentApplication);
router.get(
  "/interested-entrepreneurs",
  validateJWT,
  getPagination,
  getInterestedEntrepreneurs,
);
router.get("/:uuid", validateJWT, getInvestmentApplication);
router.get("/", validateJWT, getPagination, getAllInvestmentApplications);
router.patch("/:uuid", validateJWT, updateInvestmentApplication);
router.delete("/:uuid", validateJWT, deleteInvestmentApplication);

// Investor action routes
router.patch("/:uuid/show-interest", validateJWT, investorShowInterest);
router.patch("/:uuid/approve", validateJWT, investorApproveApplication);
router.patch("/:uuid/reject", validateJWT, investorRejectApplication);
router.patch("/:uuid/complete", validateJWT, markInvestmentCompleted);

module.exports = router;
