const { errorResponse, successResponse } = require("../../utils/responses")
const {Attachment,Application, CratMarkets} = require("../../models");
const getUrl = require("../../utils/cloudinary_upload");



const createAttachment = async(req,res)=>{
    try {
        const uuid = req.params.uuid;
        let image = await getUrl(req);
        const application = await Application.findOne({
            where:{
                uuid
            }
        })
        
        const response = await Attachment.create({
            image,
            applicationId:application.id
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}





const deleteAttachment = async(req,res)=>{
    try {
        
        const uuid = req.params.uuid
        const Attachment = await Attachment.findOne({
            where:{
                uuid
            }
        });
        const response = await Attachment.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}
    


module.exports = {
    createAttachment,deleteAttachment
}