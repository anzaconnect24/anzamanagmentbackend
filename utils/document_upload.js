const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

// Uploader for the programme document library. Wider than me_upload: this
// holds contracts, invoices, attendance sheets, training decks and site
// photos, not just M&E evidence.
//
// The allowlist is a filter, not a guarantee - a browser sets the mime type -
// so the stored name is always generated here and the original is kept only as
// a label. Nothing is ever written under a name a caller chose.
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

module.exports = multer({
  storage: multer.diskStorage({
    destination: "./files/",
    filename: (req, file, cb) =>
      cb(
        null,
        `doc-${Date.now()}-${crypto
          .randomBytes(8)
          .toString("hex")}${path.extname(file.originalname).toLowerCase()}`,
      ),
  }),
  // Training decks and scanned contracts run larger than evidence photos.
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    ALLOWED.has(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Unsupported document file type")),
});
