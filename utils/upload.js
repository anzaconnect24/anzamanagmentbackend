const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./files/");
  },
  filename: function (req, file, cb) {
    if(file){
      let extArray = file.mimetype.split("/");
      let extension = extArray[extArray.length - 1];
      cb(null, file.originalname);
    }
  }
});
const upload = multer({ storage: storage });
module.exports = upload;
