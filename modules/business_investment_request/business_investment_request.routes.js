const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const upload = require("../../utils/upload");
const {
  createBusinessInvestmentRequest,
  updateBusinessInvestmentRequest,
  deleteBusinessInvestmentRequest,
  getUserBusinessInvestmentRequest,
  getAllBusinessInvestmentRequests,
  getReviewersStatus,
  getWaitingBusinessInvestmentRequests,
  getAcceptedBusinessInvestmentRequests,
  getRejectedBusinessInvestmentRequests,
  getBusinessInvestmentRequestDetails,
  postBusinessInvestmentRequestDocument,
  getInvestorWaitingBusinessInvestmentRequests,
  getInvestorClosedBusinessInvestmentRequests,
  getInvestorInvestmentRequests,
  approveInvestmentRequest,
  rejectInvestmentRequest,
  completeInvestment,
  getInProgressInvestments,
  getDroppedInvestments,
  getCompletedInvestments,
  entrepreneurApproveInvestorRequest,
  entrepreneurRejectInvestorRequest,
} = require("./business_investment_request.controller");

const router = Router();
router.post("/", validateJWT, createBusinessInvestmentRequest);
router.post(
  "/document/:uuid",
  upload.single("file"),
  validateJWT,
  postBusinessInvestmentRequestDocument,
);
router.get("/user/:uuid", validateJWT, getUserBusinessInvestmentRequest);
// business UUID
// ret reviewers,status()
router.get("/reviewers/:uuid", validateJWT, getReviewersStatus);
router.get("/", validateJWT, getAllBusinessInvestmentRequests);
router.get(
  "/investor/waiting",
  validateJWT,
  getInvestorWaitingBusinessInvestmentRequests,
);
router.get(
  "/investor/closed",
  validateJWT,
  getInvestorClosedBusinessInvestmentRequests,
);

// New investor-specific endpoints
router.get("/investor/requests", validateJWT, getInvestorInvestmentRequests); // Get all requests for this investor
router.get("/investor/in-progress", validateJWT, getInProgressInvestments); // Get in-progress investments
router.get("/investor/dropped", validateJWT, getDroppedInvestments); // Get rejected/dropped investments
router.get("/investor/completed", validateJWT, getCompletedInvestments); // Get completed investments
router.patch("/investor/approve/:uuid", validateJWT, approveInvestmentRequest); // Approve request (show interest)
router.patch("/investor/reject/:uuid", validateJWT, rejectInvestmentRequest); // Reject request
router.patch("/investor/complete/:uuid", validateJWT, completeInvestment); // Mark as completed

// Entrepreneur action routes
router.patch(
  "/entrepreneur/approve/:uuid",
  validateJWT,
  entrepreneurApproveInvestorRequest,
); // Entrepreneur approves investor request
router.patch(
  "/entrepreneur/reject/:uuid",
  validateJWT,
  entrepreneurRejectInvestorRequest,
); // Entrepreneur rejects investor request

router.get("/waiting", validateJWT, getWaitingBusinessInvestmentRequests);
router.get("/accepted", validateJWT, getAcceptedBusinessInvestmentRequests);
router.get("/rejected", validateJWT, getRejectedBusinessInvestmentRequests);
router.get("/:uuid", validateJWT, getBusinessInvestmentRequestDetails);
router.patch("/:uuid", validateJWT, updateBusinessInvestmentRequest);
router.delete("/:uuid", validateJWT, deleteBusinessInvestmentRequest);

module.exports = router;
