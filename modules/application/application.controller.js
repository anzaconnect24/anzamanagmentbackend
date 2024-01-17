const { errorResponse, successResponse } = require("../../utils/responses")
const {Application,User} = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const createApplication = async(req,res)=>{
    try {
        const {
            name,
            description,
        } = req.body;
        
        const user = req.user
        const application = await Application.findOne({
            where:{
                userId:user.id
            }
        })
        if (application) {
            res.status(403).json({
            status: false,
            message: "Application already created1!"
            });
        }else{
            const response = await Application.create({
                ...req.body,
                // name,
                userId:user.id,
                // description,
            })
            successResponse(res,response)
        }
    } catch (error) {
        errorResponse(res,error)
    }
}

const getUserApplication = async(req,res)=>{
    try {
        const user = req.user
        const response = await Application.findOne({
            where:{
                userId:user.id
            }
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const updateApplication = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const Application = await Application.findOne({
            where:{
                uuid
            }
        });
        //find user
        const user = await User.findOne({
            where:{id:Application.userId}
        })
        sendEmail(req, res, user, status)
        const response = await Application.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteApplication = async(req,res)=>{
    try {
        let {
            name
        } = req.body;
        const uuid = req.params.uuid
        const Application = await Application.findOne({
            where:{
                uuid
            }
        });
        const response = await Application.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getAllApplications = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await Application.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:['createdAt','DESC'],
            distinct:true,

        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getPendingApplication = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await Application.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:['createdAt','DESC'],
            distinct:true,
            where:{
                status:'Pending'
            }
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}


module.exports = {
    createApplication,updateApplication,deleteApplication,
    getUserApplication,getAllApplications,getPendingApplication
}