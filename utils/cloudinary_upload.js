
const getUrl = async(req)=>{
  const file = req.file
  return `http://195.35.8.142:5000/files/${file.originalname}` 
}
module.exports = getUrl