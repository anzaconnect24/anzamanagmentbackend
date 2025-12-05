const express = require("express");
const router = express.Router();
const quizController = require("./quiz.controller");
const { validateJWT } = require("../../utils/validateJWT");

// Quiz CRUD
router.post("/create", validateJWT, quizController.createQuiz);
router.get("/module/:moduleId", validateJWT, quizController.getQuizzesByModule);
router.get("/:uuid", validateJWT, quizController.getQuizById);
router.put("/:uuid", validateJWT, quizController.updateQuiz);
router.patch("/:uuid/publish", validateJWT, quizController.togglePublish);
router.delete("/:uuid", validateJWT, quizController.deleteQuiz);

// Question management
router.post("/:quizUuid/questions", validateJWT, quizController.addQuestion);
router.put(
  "/questions/:questionUuid",
  validateJWT,
  quizController.updateQuestion
);
router.delete(
  "/questions/:questionUuid",
  validateJWT,
  quizController.deleteQuestion
);

// Quiz attempts
router.post("/:quizUuid/start", validateJWT, quizController.startAttempt);
router.post(
  "/attempts/:attemptUuid/submit",
  validateJWT,
  quizController.submitQuiz
);
router.get(
  "/attempts/user/:quizUuid?",
  validateJWT,
  quizController.getUserAttempts
);

// Certificate
router.get(
  "/attempts/:attemptUuid/certificate",
  validateJWT,
  quizController.downloadCertificate
);

// Admin endpoints
router.get("/admin/attempts", validateJWT, quizController.getAllAttempts);
router.get(
  "/admin/attempts/:attemptUuid",
  validateJWT,
  quizController.getAttemptDetails
);
router.get(
  "/admin/pending-grading",
  validateJWT,
  quizController.getPendingQuizzes
);
router.post(
  "/admin/attempts/:attemptUuid/grade",
  validateJWT,
  quizController.gradeQuizAttempt
);
router.patch(
  "/admin/answers/:answerUuid/mark",
  validateJWT,
  quizController.markDescriptionAnswer
);
router.post(
  "/admin/answers/bulk-mark",
  validateJWT,
  quizController.bulkMarkAnswers
);

module.exports = router;
