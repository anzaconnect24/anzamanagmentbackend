const {Business,BusinessDocument} = require("../../models");
const getUrl = require("../../utils/cloudinary_upload");
const { errorResponse, successResponse } = require("../../utils/responses");
const createBusinessDocument = async(req,res)=>{
    try {
        const user = req.user
        let link = null;
        let {title,business_uuid} = req.body    
        const business = await Business.findOne({
            where:{
                uuid:business_uuid
            }
        })
        if (req.file) {
            link = await getUrl(req);
        }
        const response = await BusinessDocument.create({
            title,
            link,
            businessId:business.id
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteBusinessDocument = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const businessDocument = await BusinessDocument.findOne({
            where:{
                uuid
            }
        });
        const response = await businessDocument.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

module.exports = {createBusinessDocument,deleteBusinessDocument}