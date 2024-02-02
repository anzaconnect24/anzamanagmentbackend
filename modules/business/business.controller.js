const { errorResponse, successResponse } = require("../../utils/responses")
const {Business,User,BusinessSector,InvestorProfile,Sequelize,BusinessDocument,} = require("../../models");
const { where,Op } = require("sequelize");

const { sendEmail } = require("../../utils/send_email");
const getUrl = require("../../utils/cloudinary_upload");

const createBusiness = async(req,res)=>{
    try {
        const {
            // reviewer_uuid,
            registration,
            stage,
            name,
            email,
            phone,
            problem,
            solution,
            isAlumni,
            completedProgram,
            team,
            business_sector_uuid,
            traction,
            // status,
        } = req.body;
        
        const user = req.user
        const businessSector = await BusinessSector.findOne({
            where:{
                uuid: business_sector_uuid
            }
        })
        const response = await Business.create({
            // reviewerId,
            registration,
            stage,
            name,email,phone,
            isAlumni,
            completedProgram,
            problem,
            solution,
            team,
            businessSectorId: businessSector.id,
            traction,
            userId:user.id,
           
            // status,
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getUserBusiness = async(req,res)=>{
    try {
        const user = req.user
        const response = await Business.findOne({
            where:{
                userId:user.id
            }
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const updateBusiness = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const payload = {...req.body}
        let document;
        const {documentName} = req.body

        if(req.file){
            document = await getUrl(req)
            if(documentName=="businessPlan"){
     console.log("Reached here")

               payload.businessPlan = document;
            }
            else if(documentName=="marketResearch"){
                payload.marketResearch = document;
             }
        }
        let business = await Business.findOne({
            where:{
                uuid
            },
            
        });
  
         await business.update(payload)
         business  = await Business.findOne({
            where:{
                id:business.id
            },
            include:[BusinessDocument]
        });
        successResponse(res,business)
    } catch (error) {
        errorResponse(res,error)
    }
}

// const applicationFeedbackEmail = async (req, res,user,status) => {
//     // res.status(200).send(user.email+","+status);
//     try {
//       let promises = []; // Array to hold promises
//       var subject = '',message = '';
//   var response;
//       switch (status) {
//         case "accepted":
//             subject = 'Your seller application to Anza Management System is accepted'
//             message = 'Hello '+user.name+',<br>This is to inform you that we have accepted your request to be a seller,<br>You can now start adding your products to Anza Management System store.'
//         response =   await sendMail(user, subject, message, status);
//           break;
//         case "rejected":
//             subject = 'Your seller application to Anza Management System is rejected'
//             message = 'Hello '+user.name+',<br>This is to inform you that we have rejected your request to be a seller,<br>You can contact us for more information through phone: +255 000 000 0000,email: anza@email.com.'
//         response =   await sendMail(user, subject, message, status);
          
//           break;
//         default:
//           break;
//       }
  
//       await Promise.all(promises);
  
//       successResponse(res, response);
//     } catch (error) {
//       errorResponse(res, error);
//     }
// }

const deleteBusiness = async(req,res)=>{
    try {
        let {
            name
        } = req.body;
        const uuid = req.params.uuid
        const Business = await Business.findOne({
            where:{
                uuid
            }
        });
        const response = await Business.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getCategories = async(req,res)=>{
    try {
        const response = await Business.findAll()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getAllBusiness = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit
        
        const {count, rows} = await Business.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:[['createdAt','DESC']],
            distinct:true,
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getApprovedBusiness = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit
        
        const {count, rows} = await Business.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:[['createdAt','DESC']],
            distinct:true,
            where:{
                status: "accepted",
            },
            // attributes:{
            //     exclude: ["BusinessId"],
            //     include: [
            //         [
            //             Sequelize.literal(`(
            //                 SELECT AVG(rate)
            //                 FROM Reviews AS review
            //                 WHERE
            //                     productId = Product.id
            //             )`),
            //             'rating'
            //         ],
            //         [
            //             Sequelize.literal(`(
            //                 SELECT count(*)
            //                 FROM Reviews AS review
            //                 WHERE
            //                     productId = Product.id
            //             )`),
            //             'ratingCount'
            //         ]
            //     ],
            // },
            // include: {
            //     model:ProductImage,
            //     required: true,
            //     order: [
            //         ['createdAt', 'ASC']
            //     ],
            // }
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const findBusiness = async(req, res) =>{
    try {
        const {uuid}  = req.params
        const response = await Business.findOne({
            where:{
                uuid
            },
            attributes:{
                exclude:["userId","businessSectorId"]
            },
            include:[User,BusinessSector,BusinessDocument]
        })
        successResponse(res, response)
    } catch (error) {
        errorResponse(res, error)
    }
}

const getWaitingBusinesses = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await Business.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:[['createdAt','DESC']],
            where:{
                status:"waiting"
            },
            include: [User,BusinessSector]
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getApprovedBusinesses = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await Business.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:[['createdAt','DESC']],
            where:{
                status:"accepted"
            },
            include: [User,BusinessSector]
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getInvestorBusinesses = async(req, res) =>{
    try {
        
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit
        let accepted = "accepted"

        let user = req.user
        
        const {count, rows} = await Business.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:[['createdAt','DESC']],
            
                [Op.and]:[{
                    where:{
                    status:"accepted"
                },
                where:{
                    lookingForInvestment:true
                }}],
            

            include: [
                User,
                {
                    model:BusinessSector,
                    required:true,
                }
            ],
            attributes:{
                include: [
                    [
                        Sequelize.literal(`EXISTS(
                            SELECT *
                            FROM BusinessInvestmentRequests AS businessInvestmentRequest
                            WHERE
                                status = '${accepted}'
                        )`),
                        'invested'
                    ],
                ],
            },
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getRejectedBusinesses = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await Business.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:[['createdAt','DESC']],
            where:{
                status:"rejected"
            },
            include: [User,BusinessSector]
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}



module.exports = {
    createBusiness,updateBusiness,getApprovedBusinesses,getRejectedBusinesses,getWaitingBusinesses, getCategories,findBusiness, 
    deleteBusiness,getUserBusiness,getAllBusiness,getWaitingBusinesses,getInvestorBusinesses
}