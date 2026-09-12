const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

// Uploader for live feed posts. Images only: a feed is a conversation, not a
// document library, and anything that needs versioning belongs in a
// programme's documents instead.
//
// As everywhere else, the stored name is generated here and the name the
// browser sent is never written to disk.
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

module.exports = multer({
  storage: multer.diskStorage({
    destination: "./files/",
    filename: (req, file, cb) =>
      cb(
        null,
        `feed-${Date.now()}-${crypto
          .randomBytes(8)
          .toString("hex")}${path.extname(file.originalname).toLowerCase()}`,
      ),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    ALLOWED.has(file.mimetype)
      ? cb(null, true)
      : cb(new Error("A post image must be a JPEG, PNG, WebP or GIF")),
});
