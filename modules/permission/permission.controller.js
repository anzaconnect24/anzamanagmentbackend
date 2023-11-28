const { errorResponse, successResponse } = require("../../utils/responses")
const {Permission,User} = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const createPermission = async(req,res)=>{
    try {
        const {
            name,
            description,
        } = req.body;
        
        const user = req.user
        const permission = await Permission.findOne({
            where:{
                name
            }
        })
        if (permission) {
            res.status(403).json({
            status: false,
            message: "Permission already created1!"
            });
        }else{
            const response = await Permission.create({
                name,
                description,
            })
            successResponse(res,response)
        }
    } catch (error) {
        errorResponse(res,error)
    }
}

const getUserPermission = async(req,res)=>{
    try {
        const user = req.user
        const response = await Permission.findOne({
            where:{
                userId:user.id
            }
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const updatePermission = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const Permission = await Permission.findOne({
            where:{
                uuid
            }
        });
        //find user
        const user = await User.findOne({
            where:{id:Permission.userId}
        })
        sendEmail(req, res, user, status)
        const response = await Permission.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deletePermission = async(req,res)=>{
    try {
        let {
            name
        } = req.body;
        const uuid = req.params.uuid
        const Permission = await Permission.findOne({
            where:{
                uuid
            }
        });
        const response = await Permission.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getAllPermissions = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await Permission.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            distinct:true,

        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}


module.exports = {
    createPermission,updatePermission,deletePermission,getUserPermission,getAllPermissions
}