const cloudinary = require('cloudinary').v2;    
cloudinary.config({ 
  cloud_name: 'dcan4ecps', 
  api_key: '392775196548563', 
  api_secret: 'PKoDZbxW8pSIicpwbmMmdA8Auf8' 
});
const getUrl = async(req)=>{
    const file = req.file;
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'files', // Specify the folder in Cloudinary where you want to store the image
      public_id: req.file.originalname, // Use the original file name as the public_id (optional)
      overwrite: true // Set to true to overwrite if an image with the same name already exists (optional)
    });
    return result.secure_url;
}
module.exports = getUrl