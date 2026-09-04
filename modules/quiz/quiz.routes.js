const express = require("express");
const router = express.Router();
const quizController = require("./quiz.controller");
const { validateJWT } = require("../../utils/validateJWT");
const { requireRoles } = require("../../utils/authorization");

// Quizzes are authored and graded by staff. Learners sit them and read their
// own attempts — these write routes were open to any signed-in user.
const AUTHORS = ["Admin", "Staff", "Reviewer"];

// Quiz CRUD
router.post(
  "/create",
  validateJWT,
  requireRoles(AUTHORS),
  quizController.createQuiz,
);
router.get("/module/:moduleId", validateJWT, quizController.getQuizzesByModule);
router.get("/:uuid", validateJWT, quizController.getQuizById);
router.put("/:uuid", validateJWT, requireRoles(AUTHORS), quizController.updateQuiz);
router.patch(
  "/:uuid/publish",
  validateJWT,
  requireRoles(AUTHORS),
  quizController.togglePublish,
);
router.delete(
  "/:uuid",
  validateJWT,
  requireRoles(AUTHORS),
  quizController.deleteQuiz,
);

// Question management
router.post(
  "/:quizUuid/questions",
  validateJWT,
  requireRoles(AUTHORS),
  quizController.addQuestion,
);
router.put(
  "/questions/:questionUuid",
  validateJWT,
  requireRoles(AUTHORS),
  quizController.updateQuestion,
);
router.delete(
  "/questions/:questionUuid",
  validateJWT,
  requireRoles(AUTHORS),
  quizController.deleteQuestion,
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

// Program certificates
router.get(
  "/programs/:programUuid/certificate",
  validateJWT,
  quizController.downloadProgramCertificate
);
router.get(
  "/programs/:programUuid/completion",
  validateJWT,
  quizController.checkProgramCompletion
);

// Admin endpoints — everyone's attempts and the marking queue.
router.get(
  "/admin/attempts",
  validateJWT,
  requireRoles(AUTHORS),
  quizController.getAllAttempts,
);
router.get(
  "/admin/attempts/:attemptUuid",
  validateJWT,
  requireRoles(AUTHORS),
  quizController.getAttemptDetails,
);
router.get(
  "/admin/pending-grading",
  validateJWT,
  requireRoles(AUTHORS),
  quizController.getPendingQuizzes,
);
router.post(
  "/admin/attempts/:attemptUuid/grade",
  validateJWT,
  requireRoles(AUTHORS),
  quizController.gradeQuizAttempt,
);
router.patch(
  "/admin/answers/:answerUuid/mark",
  validateJWT,
  requireRoles(AUTHORS),
  quizController.markDescriptionAnswer,
);
router.post(
  "/admin/answers/bulk-mark",
  validateJWT,
  requireRoles(AUTHORS),
  quizController.bulkMarkAnswers,
);

module.exports = router;
