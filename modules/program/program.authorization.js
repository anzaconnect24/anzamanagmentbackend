const { Program } = require("../../models");

// The programs table is shared by four different features, each with its own
// owner. Authorising with one flat role list either locks out a legitimate
// owner or leaves the others too open, so the required roles are derived from
// the kind of program being written.
//
//   cohort      -> the accelerators startups enrol in (Startups by program)
//   grant       -> Grant Management, owned by the Finance Officer
//   mentorship  -> the BDA's own programs on the Mentorship Tracker
//   course      -> learn-and-grow Class Rooms
const MANAGERS = {
  cohort: ["Admin"],
  grant: ["Finance", "Admin", "Staff", "Reviewer"],
  mentorship: ["Mentor", "Admin", "Staff", "Reviewer"],
  // Staff upload courses and choose which programmes may open them.
  // "Staff" users are stored as either "Staff" or "Reviewer" (see SignUp).
  course: ["Admin", "Staff", "Reviewer"],
};

// Deleting is narrower than editing: removing a course destroys its modules
// and slides, so it stays with Admin even though Staff may create and edit.
const DELETERS = {
  ...MANAGERS,
  course: ["Admin"],
};

// Legacy rows pre-date the type column and are only identifiable by the
// markers the trackers embed in the description.
const MENTORSHIP_MARKER = "__TRACKER_BDAS__:";
const GRANT_MARKERS = ["__TRACKER_STARTUPS__:", "__TRACKER_CATEGORIES__:"];

const classify = ({ type, description }) => {
  const declared = String(type || "").toLowerCase();
  if (MANAGERS[declared]) return declared;

  const text = String(description || "");
  if (text.includes(MENTORSHIP_MARKER)) return "mentorship";
  if (GRANT_MARKERS.some((marker) => text.includes(marker))) return "grant";

  return "course";
};

const forbid = (res, kind) =>
  res.status(403).json({
    status: false,
    message: `You are not allowed to manage ${kind} programs`,
  });

// Create: the kind comes from the body being submitted.
const requireProgramCreator = (req, res, next) => {
  const kind = classify(req.body || {});

  if (!MANAGERS[kind].includes(req.user && req.user.role)) {
    return forbid(res, kind);
  }

  return next();
};

// Update / delete: the kind comes from the row already stored, so a caller
// cannot gain access by mislabelling the payload.
const requireProgramRole = (roleMap) => async (req, res, next) => {
  try {
    const program = await Program.findOne({
      where: { uuid: req.params.uuid },
      attributes: ["id", "type", "description"],
    });

    if (!program) {
      return res.status(404).json({
        status: false,
        message: "Program not found",
      });
    }

    const kind = classify(program);

    if (!roleMap[kind].includes(req.user && req.user.role)) {
      return forbid(res, kind);
    }

    return next();
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error,
    });
  }
};

const requireProgramManager = requireProgramRole(MANAGERS);
const requireProgramDeleter = requireProgramRole(DELETERS);

module.exports = {
  classify,
  requireProgramCreator,
  requireProgramManager,
  requireProgramDeleter,
};
