const { errorResponse, successResponse } = require("../../utils/responses")
const {BusinessInterest,User,Business} = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const createBusinessInterest = async(req,res)=>{
    try {
        const {business_uuid} = req.body
        let user = await req.user
        let business = await Business.findOne({
            where:{uuid:business_uuid}
        })
        var response = await BusinessInterest.create({businessId:business.id,userId:user.id})        
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getUserBusinessInterest = async(req,res)=>{
    try {
        const user = req.user
        const response = await BusinessInterest.findOne({
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


const updateBusinessInterest = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const BusinessInterest = await BusinessInterest.findOne({
            where:{
                uuid
            }
        });
        //find user
     
        if(status){
            const user = await User.findOne({
                where:{id:BusinessInterest.userId}
            })
            sendEmail(req, res, user, status)
        }
        const response = await BusinessInterest.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteBusinessInterest = async(req,res)=>{
    try {
     
        const uuid = req.params.uuid
        const businessInterest = await BusinessInterest.findOne({
            where:{
                uuid
            }
        });
        const response = await businessInterest.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}


const getAllBusinessInterests = async(req, res) =>{
    // res.status(200).json({"k":"v"});
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await BusinessInterest.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:[['createdAt','DESC']],
            // distinct:true,
            include:[Business,{
                model: User,
                // required: true,
            }]

        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getBusinessInterestDetails = async(req, res) =>{
    try {
        const uuid = req.params.uuid
        let user = req.user

        const response = await BusinessInterest.findOne({
            where:{uuid},
            include:[Business,{
                model: User,
                // required: true,
            }],
        })
        successResponse(res, response)
    } catch (error) {
        errorResponse(res, error)
    }
}


module.exports = {
    createBusinessInterest,updateBusinessInterest,deleteBusinessInterest,getUserBusinessInterest,getAllBusinessInterests,getBusinessInterestDetails,
}