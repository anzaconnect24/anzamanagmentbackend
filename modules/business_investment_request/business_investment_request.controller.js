const { errorResponse, successResponse } = require("../../utils/responses")
const getUrl = require("../../utils/cloudinary_upload");
const {BusinessInvestmentRequest,BusinessInvestmentRequestReview, User,Business,Sequelize,ProgramRequirement,Program,
BusinessInvestmentRequestDocument,InvestorProfile} = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const { where,Op } = require("sequelize");

const createBusinessInvestmentRequest = async(req,res)=>{
    try {
        let {business_uuid} = req.body
        const user = req.user
        const business = await Business.findOne({
            where:{uuid:business_uuid}
        })
        const response = await BusinessInvestmentRequest.create({
            userId:user.id,
            businessId:business.id
        })
        admin = await User.findOne({ where: { role:'Admin' } });
        sendEmail(req, res, admin, 'business_investment_request')
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}


const postBusinessInvestmentRequestDocument = async (req, res) => {
  try {
    const user = req.user; // Move this line to after getting user object
    let program_application_uuid = req.params.uuid;
    let fileLink = null;
    let {
      program_requirement_uuid,
    } = req.body;
   
    if (req.file) {
      fileLink = await getUrl(req);
    }

    const program_application = await BusinessInvestmentRequest.findOne({
      where: {
        uuid:program_application_uuid
      }
    });
    const program_requirement = await ProgramRequirement.findOne({
      where: {
        uuid:program_requirement_uuid
      }
    });

    const response = await BusinessInvestmentRequestDocument.create({
        programRequirementId:program_requirement.id,
        fileLink:fileLink,
        fileName:program_requirement.name,
        BusinessInvestmentRequestId:program_application.id,
    });

    successResponse(res, response);
  } catch (error) {
    console.log(error);
    errorResponse(res, error);
  }
};


const getUserBusinessInvestmentRequest = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const user = req.user
        const business = await Business.findOne({
            where:{
                uuid
            }
        })
        const response = await BusinessInvestmentRequest.findOne({
            [Op.and]:[{
                where:{
                    userId:user.id,

                },
               where: {
                businessId:business.uuid
                }
            }],
            attributes:{
                exclude:["UserId","BusinessId","userId","businessId"]
            },
           include:[
            {
                model: User,
                include:{
                    model: InvestorProfile
                }
            },
            Business
           ]
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const updateBusinessInvestmentRequest = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const businessInvestmentRequest = await BusinessInvestmentRequest.findOne({
            where:{
                uuid
            }
        });
        //find user
        const user = await User.findOne({
            where:{id:businessInvestmentRequest.userId}
        })
        sendEmail(req, res, user, status)
        const response = await businessInvestmentRequest.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteBusinessInvestmentRequest = async(req,res)=>{
    try {
        let {
            name
        } = req.body;
        const uuid = req.params.uuid
        const businessInvestmentRequest = await BusinessInvestmentRequest.findOne({
            where:{
                uuid
            }
        });
        const response = await businessInvestmentRequest.destroy()
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

const getAllBusinessInvestmentRequests = async(req, res) =>{
    // res.status(200).json({"k":"v"});
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit
        const user = req.user

        const {count, rows} = await BusinessInvestmentRequest.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:[['createdAt','DESC']],
            // distinct:true,
            attributes:{
                exclude:['UserId']
            },
            where:{
                userId:user.id
            },
            include:[
                {
                    model:User,
                    include:InvestorProfile
                },
                Business
                
            ]

        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getInvestorWaitingBusinessInvestmentRequests = async(req, res) =>{
    // res.status(200).json({"k":"v"});
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit
        const user = req.user

        const {count, rows} = await BusinessInvestmentRequest.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:[['createdAt','DESC']],
            // distinct:true,
            attributes:{
                exclude:['UserId']
            },
            where:{
                userId:user.id,
                status:'waiting'
            },
            include:[
                {
                    model:User,
                    include:InvestorProfile
                },
                Business
                
            ]

        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getInvestorClosedBusinessInvestmentRequests = async(req, res) =>{
    // res.status(200).json({"k":"v"});
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit
        const user = req.user

        const {count, rows} = await BusinessInvestmentRequest.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:[['createdAt','DESC']],
            // distinct:true,
            attributes:{
                exclude:['UserId']
            },
            where:{
                userId:user.id,
                status:'closed'
            },
            include:[
                {
                    model:User,
                    include:InvestorProfile
                },
                Business
                
            ]

        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getWaitingBusinessInvestmentRequests = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const response = await BusinessInvestmentRequest.findAll({});

        const {count, rows} = await BusinessInvestmentRequest.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:[['createdAt','DESC']],
            distinct:true,
            where:{status:'waiting'},
            include:[
                {
                    model:User,
                    // include:[InvestorProfile]
                },
                Business
            ]
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getAcceptedBusinessInvestmentRequests = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await BusinessInvestmentRequest.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:[['createdAt','DESC']],
            // distinct:true,
            where:{status:'accepted'},
            include:[
                {
                    model:User,
                    include:InvestorProfile
                },
                Business
            ]
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getRejectedBusinessInvestmentRequests = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await BusinessInvestmentRequest.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:[['createdAt','DESC']],
            // distinct:true,
            where:{status:'rejected'},
            include:[
                {
                    model:User,
                    include:InvestorProfile
                },
                Business
            ]
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getBusinessInvestmentRequestDetails = async(req, res) =>{
    try {
        const uuid = req.params.uuid

        const response = await BusinessInvestmentRequest.findOne({
            where:{uuid},
            attributes:{
                exclude:['userId','businessId'],
            },
            include:[
                BusinessInvestmentRequestDocument,
                {
                    model:User,
                    include:InvestorProfile
                },
                {
                    model:Business,
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
        const businessInvestmentRequest = await BusinessInvestmentRequest.findOne({
            where:{
                uuid
            }
        })
        const {count, rows} = await User.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:[['createdAt','DESC']],
            
            where:{role:"Reviewer"},
            include:[{
                model:BusinessInvestmentRequestReview,
                where:{
                    businessInvestmentRequestId:businessInvestmentRequest.id
                },
                required:false
            }],
            attributes:{
                // exclude:["BusinessId"],
                include: [
                    [
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
    createBusinessInvestmentRequest,updateBusinessInvestmentRequest,deleteBusinessInvestmentRequest,getUserBusinessInvestmentRequest,getAllBusinessInvestmentRequests,getReviewersStatus,
    getWaitingBusinessInvestmentRequests,getAcceptedBusinessInvestmentRequests,getRejectedBusinessInvestmentRequests,getBusinessInvestmentRequestDetails,deleteProgramRequirement,
    postBusinessInvestmentRequestDocument,getInvestorWaitingBusinessInvestmentRequests,getInvestorClosedBusinessInvestmentRequests
}