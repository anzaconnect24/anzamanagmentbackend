const path = require("path");
const production_endpoint = require("./endpoints");
require("dotenv").config({ path: path.join(__dirname, "../", ".env") });

module.exports.fileUploader = (req, res, next) => {
  if (req.files == null) {
    return res.status(400).send({
      status: false,
      message: "No file to upload"
    });
  } else {
    res.json({
      body: req.files
    });
    const file = req.files.file;
    req.filePath = production_endpoint + file.name;
    // res.status(200).send(file);
    file.mv(path.join(__dirname, "../", "files", file.name), (err) => {
      if (err) {
        return res.status(500).send({
          status: false,
          message: "File upload failed"
        });
      }
    });
  }
  next();
};
