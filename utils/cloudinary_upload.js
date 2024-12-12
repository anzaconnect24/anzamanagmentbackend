const getUrl = async (req) => {
  const file = req.file;
  return `https://api.anzaconnect.co.tz/files/${file.originalname}`;
};
module.exports = getUrl;

const getUrl = async(req)=>{
  const file = req.file
  return `https://serverapipointer.online/files/${file.originalname}` 
}
module.exports = getUrl