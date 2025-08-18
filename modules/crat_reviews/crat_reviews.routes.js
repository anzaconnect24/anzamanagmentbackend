const express = require("express");
const router = express.Router();
const CratReviewController = require("./crat_reviews.controller");

// Create a new CRAT review (Entrepreneur submits for review)
router.post("/", CratReviewController.createCratReview);

// Get all CRAT reviews (Admin view)
router.get("/", CratReviewController.getAllCratReviews);

// Get CRAT reviews by entrepreneur ID
router.get(
  "/entrepreneur/:userId",
  CratReviewController.getCratReviewsByEntrepreneur
);

// Get CRAT reviews assigned to reviewer
router.get("/reviewer/:userId", CratReviewController.getCratReviewsByReviewer);

// Get single CRAT review by UUID
router.get("/:uuid", CratReviewController.getCratReviewByUuid);

// Assign reviewer to CRAT review (Admin action)
router.put("/:uuid/assign", CratReviewController.assignReviewer);

// Submit review (Staff/Reviewer action)
router.put("/:uuid/review", CratReviewController.submitReview);

// Finalize review (Admin action)
router.put("/:uuid/finalize", CratReviewController.finalizeReview);

// Update CRAT review
router.put("/:uuid", CratReviewController.updateCratReview);

// Delete CRAT review
router.delete("/:uuid", CratReviewController.deleteCratReview);

module.exports = router;
