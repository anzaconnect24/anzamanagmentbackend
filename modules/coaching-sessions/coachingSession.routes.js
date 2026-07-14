const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const { requireRoles } = require("../../utils/authorization");
const {
  createCoachingSession,
  getEntrepreneurCoachingSessions,
  deleteCoachingSession,
} = require("./coachingSession.controllers");

const router = Router();

// Create a new coaching session (BDA/Staff logs a session)
router.post(
  "/",
  validateJWT,
  requireRoles(["Mentor", "Staff", "Reviewer", "Admin", "Finance"]),
  createCoachingSession,
);

// Get coaching sessions for a specific entrepreneur
router.get(
  "/entreprenuer/:uuid",
  validateJWT,
  requireRoles([
    "Mentor",
    "Staff",
    "Reviewer",
    "Admin",
    "Finance",
    "Enterprenuer",
  ]),
  getEntrepreneurCoachingSessions,
);

// Delete a coaching session
router.delete(
  "/:uuid",
  validateJWT,
  requireRoles(["Mentor", "Staff", "Reviewer", "Admin", "Finance"]),
  deleteCoachingSession,
);

module.exports = router;
