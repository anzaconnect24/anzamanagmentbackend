const { errorResponse, successResponse } = require("../../utils/responses")
const {SuccessStory,User,Business} = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const getUrl = require("../../utils/cloudinary_upload");

const createSuccessStory = async(req,res)=>{
    try {
        // let documentLink = null
        const {title,story,videoLink,business_uuid} = req.body
        let user = await req.user
        // if (req.file) {
        //     documentLink = await getUrl(req);
        // }
        let business = await Business.findOne({
            where:{uuid:business_uuid}
        })
        var response = await SuccessStory.create({businessId:business.id,title,story,videoLink})        
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getUserSuccessStory = async(req,res)=>{
    try {
        const user = req.user
        const response = await SuccessStory.findOne({
            where:{
                userId:user.id
            },
            include:[User,{
                model: Business,
                required: true
            }]
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}


const updateSuccessStory = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const successStory = await SuccessStory.findOne({
            where:{
                uuid
            }
        });
  
        const response = await successStory.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteSuccessStory = async(req,res)=>{
    try {
     
        const uuid = req.params.uuid
        const successStory = await SuccessStory.findOne({
            where:{
                uuid
            }
        });
        const response = await successStory.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}


const getAllSuccessStorys = async(req, res) =>{
    // res.status(200).json({"k":"v"});
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await SuccessStory.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:[['createdAt','DESC']],
            // distinct:true,
            include:[{
                model:Business,
                include:[User]
            },]

        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getSuccessStoryDetails = async(req, res) =>{
    try {
        const uuid = req.params.uuid
        // let user = req.user

        const response = await SuccessStory.findOne({
            where:{uuid},
            include:[Business],
        })
        successResponse(res, response)
    } catch (error) {
        errorResponse(res, error)
    }
}


module.exports = {
    createSuccessStory,updateSuccessStory,deleteSuccessStory,getUserSuccessStory,getAllSuccessStorys,getSuccessStoryDetails,
}