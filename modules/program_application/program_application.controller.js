const { errorResponse, successResponse } = require("../../utils/responses")
const {ProgramApplication,User,Business,Sequelize,ProgramRequirement} = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const createProgramApplication = async(req,res)=>{
    try {
        const response = await ProgramApplication.create({...req.body})
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getUserProgramApplication = async(req,res)=>{
    try {
        const user = req.user
        const response = await ProgramApplication.findOne({
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

const updateProgramApplication = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const ProgramApplication = await ProgramApplication.findOne({
            where:{
                uuid
            }
        });
        //find user
        const user = await User.findOne({
            where:{id:ProgramApplication.userId}
        })
        sendEmail(req, res, user, status)
        const response = await ProgramApplication.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteProgramApplication = async(req,res)=>{
    try {
        let {
            name
        } = req.body;
        const uuid = req.params.uuid
        const ProgramApplication = await ProgramApplication.findOne({
            where:{
                uuid
            }
        });
        const response = await ProgramApplication.destroy()
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

const getAllProgramApplications = async(req, res) =>{
    // res.status(200).json({"k":"v"});
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await ProgramApplication.findAndCountAll({
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

const getBfaProgramApplications = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await ProgramApplication.findAndCountAll({
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

const getIraProgramApplications = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await ProgramApplication.findAndCountAll({
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

const getProgramApplicationDetails = async(req, res) =>{
    try {
        const uuid = req.params.uuid

        const response = await ProgramApplication.findOne({
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
                model: ProgramApplication,
                // required: true
            },
            attributes:{
                // exclude:["BusinessId"],

                // ProgramApplication: title,type,
                // ProgramRequirement: name,ProgramApplicationid
                // return ProgramApplication + ProgramRequirement
                // ProgramApplicationapplication: userid,ProgramApplicationid,status(wait/reje/acce)
                // ProgramApplicationappliccationdocument: ProgramApplicationapplicationid,filelink,filename
                // ProgramApplicationapplicationreview: ProgramApplicationapplicationid,status,userid,feedback

                include: [
                    [
                        // SELECT userId
                        Sequelize.literal(`(
                            SELECT count(*)
                            FROM ProgramApplications AS ProgramApplication
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
    createProgramApplication,updateProgramApplication,deleteProgramApplication,getUserProgramApplication,getAllProgramApplications,getReviewersStatus,
    getBfaProgramApplications,getIraProgramApplications,getProgramApplicationDetails,deleteProgramRequirement
}