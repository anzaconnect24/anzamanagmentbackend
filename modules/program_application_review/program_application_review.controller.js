const { errorResponse, successResponse } = require("../../utils/responses")
const {ProgramReview,User,Business,Sequelize,ProgramRequirement} = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const createProgramReview = async(req,res)=>{
    try {
        const response = await ProgramReview.create({...req.body})
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getUserProgramReview = async(req,res)=>{
    try {
        const user = req.user
        const response = await ProgramReview.findOne({
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

const updateProgramReview = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const ProgramReview = await ProgramReview.findOne({
            where:{
                uuid
            }
        });
        //find user
        const user = await User.findOne({
            where:{id:ProgramReview.userId}
        })
        sendEmail(req, res, user, status)
        const response = await ProgramReview.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteProgramReview = async(req,res)=>{
    try {
        let {
            name
        } = req.body;
        const uuid = req.params.uuid
        const ProgramReview = await ProgramReview.findOne({
            where:{
                uuid
            }
        });
        const response = await ProgramReview.destroy()
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

const getAllProgramReviews = async(req, res) =>{
    // res.status(200).json({"k":"v"});
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await ProgramReview.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            // distinct:true,
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

const getBfaProgramReviews = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await ProgramReview.findAndCountAll({
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

const getIraProgramReviews = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await ProgramReview.findAndCountAll({
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

const getProgramReviewDetails = async(req, res) =>{
    try {
        const uuid = req.params.uuid

        const response = await ProgramReview.findOne({
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
            distinct:true,
            where:{role:"customer"},
            include:{
                model: Business,
                where:{uuid},
                required: true
            },
            include:{
                model: ProgramReview,
                // required: true
            },
            attributes:{
                // exclude:["BusinessId"],

                // ProgramReview: title,type,
                // ProgramRequirement: name,ProgramReviewid
                // return ProgramReview + ProgramRequirement
                // ProgramReviewapplication: userid,ProgramReviewid,status(wait/reje/acce)
                // ProgramReviewappliccationdocument: ProgramReviewapplicationid,filelink,filename
                // ProgramReviewapplicationreview: ProgramReviewapplicationid,status,userid,feedback

                include: [
                    [
                        // SELECT userId
                        Sequelize.literal(`(
                            SELECT count(*)
                            FROM ProgramReviews AS ProgramReview
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
    createProgramReview,updateProgramReview,deleteProgramReview,getUserProgramReview,getAllProgramReviews,getReviewersStatus,
    getBfaProgramReviews,getIraProgramReviews,getProgramReviewDetails,deleteProgramRequirement
}