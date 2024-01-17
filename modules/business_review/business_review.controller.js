const { errorResponse, successResponse } = require("../../utils/responses")
const {BusinessReview,User,Business,Sequelize} = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const businessreview = require("../../models/businessreview");
const { where } = require("sequelize");

const createBusinessReview = async(req,res)=>{
    try {
        const {
            user_uuid,
            business_uuid,
        } = req.body;
        
        const user = await User.findOne({
            where:{
                uuid:user_uuid
            }
        })
     
        const business = await Business.findOne({
            where:{
               uuid:business_uuid
            }
        })


   const response =   await BusinessReview.create({
        userId:user.id,
        businessId:business.id
      })
      successResponse(res,response)
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
                model: Business,
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
        const {uuid} = req.params
        const businessReview = await BusinessReview.findOne({
            where:{
                uuid
            }
        });
        const response = await businessReview.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getAllBusinessReviews = async(req, res) =>{
    try {
        const user = req.user
        const response = await BusinessReview.findAll({
            where:{
                userId:user.id
            },
            include:{
                model: Business
            }
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res, error)
    }
}

const getReviewersStatus = async(req, res) =>{
    try {
        const uuid = req.params.uuid
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await User.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:['createdAt','DESC'],
            distinct:true,
            where:{role:"Reviewer"},
            include:{
                model: Business,
                where:{uuid},
                required: true
            },
            include:{
                model: BusinessReview
            },
            attributes:{
                include: [
                    [
                        Sequelize.literal(`(
                            SELECT count(*)
                            FROM BusinessReviews AS businessReview
                            WHERE
                                userId = User.id
                        )`),
                        'status'
                    ],
                ],
            }
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}


module.exports = {
    createBusinessReview,updateBusinessReview,deleteBusinessReview,getUserBusinessReview,getAllBusinessReviews,getReviewersStatus
}