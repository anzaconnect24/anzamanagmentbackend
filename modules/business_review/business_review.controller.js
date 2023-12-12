const { errorResponse, successResponse } = require("../../utils/responses")
const {BusinessReview,User,Business} = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const createBusinessReview = async(req,res)=>{
    try {
        const {
            name,
            description,
            business_uuid,
        } = req.body;
        
        const user = req.user
        const BusinessReview = await BusinessReview.findOne({
            where:{
                userId:user.id
            }
        })
        if (BusinessReview) {
            res.status(403).json({
            status: false,
            message: "BusinessReview already created1!"
            });
        }else{
            const business = await Business.findOne({
                where:{
                    uuid:business_uuid
                }
            })
            if (business) {
                const response = await BusinessReview.create({
                    ...req.body,
                    // name,
                    userId:user.id,
                    businessId:business.id,
                    // description,
                })
                successResponse(res,response)
                
            } else {
                res.status(403).json({
                    status: false,
                    message: "business not found!"
                });
            }
        }
    } catch (error) {
        errorResponse(res,error)
    }
}

const getUserBusinessReview = async(req,res)=>{
    try {
        const user = req.user
        const response = await BusinessReview.findOne({
            where:{
                userId:user.id
            },
            include:{
                model: business,
                required: true
            }
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const updateBusinessReview = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const BusinessReview = await BusinessReview.findOne({
            where:{
                uuid
            }
        });
        //find user
        const user = await User.findOne({
            where:{id:BusinessReview.userId}
        })
        sendEmail(req, res, user, status)
        const response = await BusinessReview.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteBusinessReview = async(req,res)=>{
    try {
        let {
            name
        } = req.body;
        const uuid = req.params.uuid
        const BusinessReview = await BusinessReview.findOne({
            where:{
                uuid
            }
        });
        const response = await BusinessReview.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getAllBusinessReviews = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await BusinessReview.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            distinct:true,
            include:{
                model: business,
                required: true
            }

        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}


module.exports = {
    createBusinessReview,updateBusinessReview,deleteBusinessReview,getUserBusinessReview,getAllBusinessReviews
}