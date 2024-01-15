const { errorResponse, successResponse } = require("../../utils/responses")
const {ProgramApplicationReview,User,Program,Business,Sequelize,ProgramRequirement,ProgramApplication} = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const { where } = require("sequelize");

const createProgramApplicationReview = async(req,res)=>{
    try {
        let{program_application_uuid,user_uuid} = req.body
        const user = await User.findOne({
            where:{
                uuid:user_uuid
            }
        })
        const programApplication = await ProgramApplication.findOne({
            where:{
                uuid:program_application_uuid
            }
        })

        const response = await ProgramApplicationReview.create({
            programApplicationId:programApplication.id,
            userId:user.id,
            feedback:""
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getUserProgramApplicationReview = async(req,res)=>{
    try {
        const user = req.user
        const response = await ProgramApplicationReview.findOne({
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

const updateProgramApplicationReview = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const ProgramApplicationReview = await ProgramApplicationReview.findOne({
            where:{
                uuid
            }
        });
        //find user
        const user = await User.findOne({
            where:{id:ProgramApplicationReview.userId}
        })
        sendEmail(req, res, user, status)
        const response = await ProgramApplicationReview.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteProgramApplicationReview = async(req,res)=>{
    try {
    
        const uuid = req.params.uuid
        const programApplicationReview = await ProgramApplicationReview.findOne({
            where:{
                uuid
            }
        });
        const response = await programApplicationReview.destroy()
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

const getAllProgramApplicationReviews = async(req, res) =>{
    // res.status(200).json({"k":"v"});
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit
        const user = req.user;
        const {count, rows} = await ProgramApplicationReview.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit,
            where:{
                userId:user.id
            },
            include:[{
                model:ProgramApplication,
                include:[Program,User]
            }]
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getBfaProgramApplicationReviews = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await ProgramApplicationReview.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
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

const getIraProgramApplicationReviews = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await ProgramApplicationReview.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
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

const getProgramApplicationReviewDetails = async(req, res) =>{
    try {
        const uuid = req.params.uuid

        const response = await ProgramApplicationReview.findOne({
            where:{uuid},
            include:{
                model: ProgramRequirement,
                // required: true,
            }
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
            
            where:{role:"customer"},
            include:{
                model: Business,
                where:{uuid},
                required: true
            },
           
            attributes:{
                // exclude:["BusinessId"],

                // ProgramApplicationReview: title,type,
                // ProgramRequirement: name,ProgramApplicationReviewid
                // return ProgramApplicationReview + ProgramRequirement
                // ProgramApplicationReviewapplication: userid,ProgramApplicationReviewid,status(wait/reje/acce)
                // ProgramApplicationReviewappliccationdocument: ProgramApplicationReviewapplicationid,filelink,filename
                // ProgramApplicationReviewapplicationreview: ProgramApplicationReviewapplicationid,status,userid,feedback

                include: [
                    [
                        // SELECT userId
                        Sequelize.literal(`(
                            SELECT count(*)
                            FROM ProgramApplicationReviews AS ProgramApplicationReview
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
    createProgramApplicationReview,updateProgramApplicationReview,deleteProgramApplicationReview,getUserProgramApplicationReview,getAllProgramApplicationReviews,getReviewersStatus,
    getBfaProgramApplicationReviews,getIraProgramApplicationReviews,getProgramApplicationReviewDetails,deleteProgramRequirement
}