// Storage for capital facilitation documents.
//
// Deliberately NOT the ./files folder: that folder is served publicly at
// /files, and these are financial statements, legal and tax documents. Files
// here are only reachable through the authenticated download endpoint, which
// checks the document's visibility and writes the access to the audit trail.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const DIRECTORY = path.join(__dirname, "..", "private_files", "capital");
fs.mkdirSync(DIRECTORY, { recursive: true });

const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: DIRECTORY,
    // A random name: the original name is kept in the database, never used as
    // a path, so it cannot point anywhere outside this folder.
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${path.extname(file.originalname).toLowerCase().slice(0, 10)}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    ALLOWED.has(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Unsupported file type. Upload PDF, Office, CSV, text or image files.")),
});

// The absolute path of a stored file, refusing anything that is not a bare
// file name inside the capital folder.
const storedPath = (storedName) => {
  const name = path.basename(String(storedName || ""));
  if (!name || name !== storedName) return null;
  return path.join(DIRECTORY, name);
};

const removeStored = (storedName) => {
  const file = storedPath(storedName);
  if (file) fs.promises.unlink(file).catch(() => {});
};

module.exports = { upload, storedPath, removeStored, DIRECTORY };
