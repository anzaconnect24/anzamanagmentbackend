const getUrl = async (req) => {
  const file = req.file;
  return `${req.protocol}://${req.get("host")}/files/${file.originalname}`;
};

module.exports = getUrl;
