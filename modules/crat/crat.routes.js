const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const upload = require("../../utils/upload");
const controller = require("./crat.controller");

const router = Router();

router.get("/catalog/:businessId", validateJWT, controller.getCatalog);
router.get(
  "/assessments/:businessId/current",
  validateJWT,
  controller.getCurrentAssessment,
);
router.put(
  "/assessments/:assessmentId/answers",
  validateJWT,
  controller.saveEntrepreneurAnswers,
);
router.post(
  "/assessments/:assessmentId/answers/:questionId/attachment",
  upload.single("file"),
  validateJWT,
  controller.uploadEntrepreneurAttachment,
);
router.post(
  "/assessments/:assessmentId/submit",
  validateJWT,
  controller.submitAssessment,
);

router.get("/admin/queue", validateJWT, controller.getAdminQueue);
router.post(
  "/admin/assessments/:assessmentId/assign",
  validateJWT,
  controller.assignReviewer,
);
router.post(
  "/admin/assessments/:assessmentId/approve",
  validateJWT,
  controller.approveAssessment,
);
router.post(
  "/admin/assessments/:assessmentId/reject",
  validateJWT,
  controller.rejectAssessment,
);
router.post(
  "/admin/assessments/:assessmentId/ai-review",
  validateJWT,
  controller.executeAiReview,
);

// Admin Catalog Management
router.get("/admin/catalog-mgmt", validateJWT, controller.getAdminCatalog);
router.post("/admin/catalog-mgmt", validateJWT, controller.createQuestion);
router.put(
  "/admin/catalog-mgmt/:questionId",
  validateJWT,
  controller.updateQuestion,
);
router.patch(
  "/admin/catalog-mgmt/:questionId/toggle",
  validateJWT,
  controller.toggleQuestionActive,
);

router.get(
  "/reviewer/assignments",
  validateJWT,
  controller.getReviewerAssignments,
);
router.put(
  "/reviewer/assessments/:assessmentId/scores",
  validateJWT,
  controller.saveReviewerScores,
);
router.post(
  "/reviewer/assessments/:assessmentId/submit",
  validateJWT,
  controller.submitReviewerAssessment,
);

router.get(
  "/reports/:businessId/internal",
  validateJWT,
  controller.getInternalReport,
);
router.get(
  "/reports/:businessId/published",
  validateJWT,
  controller.getPublishedReport,
);

module.exports = router;
