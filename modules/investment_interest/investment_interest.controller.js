const { errorResponse, successResponse } = require("../../utils/responses")
const {InvestmentInterest,User,Business} = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const createInvestmentInterest = async(req,res)=>{
    try {
        const {business_uuid,from,user_uuid} = req.body
        let user ;
        let business = await Business.findOne({
            where:{uuid:business_uuid}
        })

        if(from == "investor"){
            user = await req.user
        }
        else{
            user = await User.findOne({
                where:{
                    uuid:user_uuid
                }
            })
        }
        var response = await InvestmentInterest.create({businessId:business.id,userId:user.id,from})        
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getUserInvestmentInterest = async(req,res)=>{
    try {
        const user = req.user
        const response = await InvestmentInterest.findOne({
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


const updateInvestmentInterest = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const InvestmentInterest = await InvestmentInterest.findOne({
            where:{
                uuid
            }
        });
        //find user
     
        if(status){
            const user = await User.findOne({
                where:{id:InvestmentInterest.userId}
            })
            sendEmail(req, res, user, status)
        }
        const response = await InvestmentInterest.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteInvestmentInterest = async(req,res)=>{
    try {
     
        const uuid = req.params.uuid
        const InvestmentInterest = await InvestmentInterest.findOne({
            where:{
                uuid
            }
        });
        const response = await InvestmentInterest.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}


const getAllInvestmentInterests = async(req, res) =>{
    // res.status(200).json({"k":"v"});
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await InvestmentInterest.findAndCountAll({
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

const getInvestmentInterestDetails = async(req, res) =>{
    try {
        const uuid = req.params.uuid
        let user = req.user

        const response = await InvestmentInterest.findOne({
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
    createInvestmentInterest,updateInvestmentInterest,deleteInvestmentInterest,getUserInvestmentInterest,getAllInvestmentInterests,getInvestmentInterestDetails,
}