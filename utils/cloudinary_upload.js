const getUrl = async (req) => {
  const file = req.file;
  return `http://localhost:5000/files/${file.originalname}`;
};
module.exports = getUrl;
