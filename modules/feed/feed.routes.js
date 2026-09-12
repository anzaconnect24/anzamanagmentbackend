const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const feedUpload = require("../../utils/feed_upload");
const {
  getFeed,
  createPost,
  removePost,
  reactToPost,
  repostPost,
  savePost,
  getComments,
  createComment,
  removeComment,
  getFeedMembers,
} = require("./feed.controller");

const router = Router();

// The live feed belongs to everyone signed in, so there is no requireRoles
// anywhere in this file. That absence is the feature: a startup and an
// investor read and write the same board.
//
// The only permission in the module is who may take something down, and that
// is decided per row in the controller - the author, or an administrator.

router.get("/", validateJWT, getFeed);
router.get("/members", validateJWT, getFeedMembers);

// Posting is multipart so a post can carry one image.
router.post("/", validateJWT, feedUpload.single("image"), createPost);
router.delete("/:uuid", validateJWT, removePost);

// Like, dislike, or take it back — all one call.
router.put("/:uuid/reaction", validateJWT, reactToPost);

// Reshare a post, or save it for later — both toggle.
router.post("/:uuid/repost", validateJWT, repostPost);
router.put("/:uuid/save", validateJWT, savePost);

router.get("/:uuid/comments", validateJWT, getComments);
router.post("/:uuid/comments", validateJWT, createComment);
router.delete("/comments/:commentUuid", validateJWT, removeComment);

module.exports = router;
