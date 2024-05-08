
const getUrl = async(req)=>{
  const file = req.file
  return `https://serverapipointer.online/files/${file.originalname}` 
}
module.exports = getUrl