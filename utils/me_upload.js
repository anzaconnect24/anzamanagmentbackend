const multer=require("multer"),path=require("path"),crypto=require("crypto");
const allowed=new Set(["application/pdf","image/jpeg","image/png","text/csv","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
module.exports=multer({storage:multer.diskStorage({destination:"./files/",filename:(req,file,cb)=>cb(null,`me-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${path.extname(file.originalname).toLowerCase()}`)}),limits:{fileSize:10*1024*1024},fileFilter:(req,file,cb)=>allowed.has(file.mimetype)?cb(null,true):cb(new Error("Unsupported evidence file type"))});
