const { errorResponse, successResponse } = require("../../utils/responses")
const {BusinessInvestmentRequestReview,User,Program,Business,Sequelize,ProgramRequirement,BusinessInvestmentRequest} = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const { where } = require("sequelize");

const createBusinessInvestmentRequestReview = async(req,res)=>{
    try {
        let{business_investment_request_uuid,user_uuid} = req.body
        const user = await User.findOne({
            where:{
                uuid:user_uuid
            }
        })
        const businessInvestmentRequest = await BusinessInvestmentRequest.findOne({
            where:{
                uuid:business_investment_request_uuid
            }
        })

        const response = await BusinessInvestmentRequestReview.create({
            businessInvestmentRequestId:businessInvestmentRequest.id,
            userId:user.id,
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getUserBusinessInvestmentRequestReview = async(req,res)=>{
    try {
        const user = req.user
        const response = await BusinessInvestmentRequestReview.findOne({
            where:{
                userId:user.id
            },
            include:{
                model: BusinessInvestmentRequest,
                required: true
            }
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const updateBusinessInvestmentRequestReview = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const businessInvestmentRequestReview = await BusinessInvestmentRequestReview.findOne({
            where:{
                uuid
            }
        });
        //find user
        const user = await User.findOne({
            where:{id:businessInvestmentRequestReview.userId}
        })
        sendEmail(req, res, user, status)
        const response = await businessInvestmentRequestReview.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteBusinessInvestmentRequestReview = async(req,res)=>{
    try {
    
        const uuid = req.params.uuid
        const businessInvestmentRequestReview = await BusinessInvestmentRequestReview.findOne({
            where:{
                uuid
            }
        });
        const response = await businessInvestmentRequestReview.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteProgramRequirement = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const ProgramRequirement = await ProgramRequirement.findOne({
            where:{
                uuid
            }
        });
        const response = await ProgramRequirement.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getAllBusinessInvestmentRequestReviews = async(req, res) =>{
    // res.status(200).json({"k":"v"});
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit
        const user = req.user;
        const {count, rows} = await BusinessInvestmentRequestReview.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit,
            where:{
                userId:user.id
            },
            include:[{
                model:BusinessInvestmentRequest,
                include:[
                    Business,
                    {
                        model:User
                    }
                ]
            }]
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getBfaBusinessInvestmentRequestReviews = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await BusinessInvestmentRequestReview.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:['createdAt','DESC'],
            // distinct:true,
            where:{type:'bfa'},
            include:{
                model: ProgramRequirement,
                // required: true,
            }
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getIraBusinessInvestmentRequestReviews = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await BusinessInvestmentRequestReview.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:['createdAt','DESC'],
            // distinct:true,
            where:{type:'ira'},
            include:{
                model: ProgramRequirement,
                // required: true,
            }
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getBusinessInvestmentRequestReviewDetails = async(req, res) =>{
    try {
        const uuid = req.params.uuid

        const response = await BusinessInvestmentRequestReview.findOne({
            where:{uuid},
            include:[
                {
                    model:User,
                },
                {
                    model: BusinessInvestmentRequest,
                    // required: true,
                }
            ]
        })
        successResponse(res, response)
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
            
            where:{role:"Reviewer"},
            include:{
                model: BusinessInvestmentRequest,
                where:{uuid},
                // required: true
            },
           
            attributes:{
                // exclude:["BusinessId"],
                include: [
                    [
                        // SELECT userId
                        Sequelize.literal(`EXISTS(
                            SELECT *
                            FROM BusinessInvestmentRequestReviews AS businessInvestmentRequestReview
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
    createBusinessInvestmentRequestReview,updateBusinessInvestmentRequestReview,deleteBusinessInvestmentRequestReview,getUserBusinessInvestmentRequestReview,getAllBusinessInvestmentRequestReviews,getReviewersStatus,
    getBfaBusinessInvestmentRequestReviews,getIraBusinessInvestmentRequestReviews,getBusinessInvestmentRequestReviewDetails,deleteProgramRequirement
}