const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  getCalendar,
  getSummary,
  getAudiences,
  saveEvent,
  removeEvent,
  respondToEvent,
  getFeed,
  resetFeed,
  getFeedFile,
} = require("./calendar.controller");

const router = Router();

// Every signed-in account has a calendar, so there is no requireRoles here.
// The only role question in this module is who may publish to somebody else,
// and that is answered per request in the controller: Admin and BDA publish,
// everyone else keeps reminders nobody can read.

// The one unauthenticated route on the calendar, and it is first on purpose:
// it has to be matched before "/:recordUuid" can swallow "feed". A calendar
// app fetches this with no session to offer, so the token in the path is the
// whole credential — which is why it is long, random, and revocable on its own.
router.get("/feed/:token.ics", getFeedFile);

router.get("/", validateJWT, getCalendar);

// Counts only, for the dot in the top bar.
router.get("/summary", validateJWT, getSummary);

// The programmes and people an event can be addressed to. Publishers only —
// it is a list of every programme and account on the platform.
router.get("/audiences", validateJWT, getAudiences);

// This person's own subscription URL, and rolling it when the link gets out.
router.get("/feed", validateJWT, getFeed);
router.post("/feed/reset", validateJWT, resetFeed);

router.post("/", validateJWT, saveEvent);
router.patch("/:recordUuid", validateJWT, saveEvent);
router.delete("/:recordUuid", validateJWT, removeEvent);

// Saying yes or no to an invitation addressed to you by name.
router.post("/:recordUuid/respond", validateJWT, respondToEvent);

module.exports = router;
