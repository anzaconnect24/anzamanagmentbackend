const getUrl = async (req) => {
  const file = req.file;
  console.log('this is the file:', file);
  return `https://api.anzaconnect.co.tz/files/${file.originalname}`;
};

module.exports = getUrl;
