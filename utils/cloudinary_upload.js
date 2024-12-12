const getUrl = async (req) => {
  const file = req.file;
  return `https://api.anzaconnect.co.tz/files/${file.originalname}`;
};

module.exports = getUrl;
