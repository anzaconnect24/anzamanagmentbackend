const { errorResponse, successResponse } = require("../../utils/responses")
const {ApplicationReview,User,Application} = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const createApplicationReview = async(req,res)=>{
    try {
        const {
            name,
            description,
            application_uuid,
        } = req.body;
        
        const user = req.user
        const applicationReview = await ApplicationReview.findOne({
            where:{
                userId:user.id
            }
        })
        if (applicationReview) {
            res.status(403).json({
            status: false,
            message: "ApplicationReview already created1!"
            });
        }else{
            const application = await Application.findOne({
                where:{
                    uuid:application_uuid
                }
            })
            if (application) {
                const response = await ApplicationReview.create({
                    ...req.body,
                    // name,
                    userId:user.id,
                    applicationId:application.id,
                    // description,
                })
                successResponse(res,response)
                
            } else {
                res.status(403).json({
                    status: false,
                    message: "Application not found!"
                });
            }
        }
    } catch (error) {
        errorResponse(res,error)
    }
}

const getUserApplicationReview = async(req,res)=>{
    try {
        const user = req.user
        const response = await ApplicationReview.findOne({
            where:{
                userId:user.id
            }
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const updateApplicationReview = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const ApplicationReview = await ApplicationReview.findOne({
            where:{
                uuid
            }
        });
        //find user
        const user = await User.findOne({
            where:{id:ApplicationReview.userId}
        })
        sendEmail(req, res, user, status)
        const response = await ApplicationReview.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteApplicationReview = async(req,res)=>{
    try {
        let {
            name
        } = req.body;
        const uuid = req.params.uuid
        const ApplicationReview = await ApplicationReview.findOne({
            where:{
                uuid
            }
        });
        const response = await ApplicationReview.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getAllApplicationReviews = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await ApplicationReview.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            distinct:true,

        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}


module.exports = {
    createApplicationReview,updateApplicationReview,deleteApplicationReview,getUserApplicationReview,getAllApplicationReviews
}