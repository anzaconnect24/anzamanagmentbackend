
// const getUrl = async(req)=>{
//   const file = req.file
//   return `https://serverapipointer.online/files/${file.originalname}` 
// }

const getUrl = async(req)=>{
  const file = req.file
  return `localhost:5001/files/${file.originalname}` 
}

module.exports = getUrl