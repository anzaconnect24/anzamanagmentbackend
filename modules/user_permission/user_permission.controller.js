const { errorResponse, successResponse } = require("../../utils/responses")
const {UserPermission,User,Permission} = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const createUserPermission = async(req,res)=>{
    try {
        const {
            user_uuid,
            permission_uuid,
        } = req.body;
        
        // const user = req.user
        const user = await User.findOne({
            where:{
                uuid:user_uuid
            }
        })
        const permission = await Permission.findOne({
            where:{
                uuid:permission_uuid
            }
        })
        const userPermission = await UserPermission.findOne({
            where:{
                userId:user.id,
                permissionId:permission.id,
            }
        })
        if (userPermission) {
            res.status(403).json({
            status: false,
            message: "UserPermission already created1!"
            });
        }else{
            const response = await UserPermission.create({
                userId:user.id,
                permissionId:permission.id,
            })
            successResponse(res,response)
        }
    } catch (error) {
        errorResponse(res,error)
    }
}

const getUserUserPermission = async(req,res)=>{
    try {
        const user = req.user
        const response = await UserPermission.findOne({
            where:{
                userId:user.id
            }
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const updateUserPermission = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const UserPermission = await UserPermission.findOne({
            where:{
                uuid
            }
        });
        //find user
        const user = await User.findOne({
            where:{id:UserPermission.userId}
        })
        sendEmail(req, res, user, status)
        const response = await UserPermission.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteUserPermission = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const UserPermission = await UserPermission.findOne({
            where:{
                uuid
            }
        });
        const response = await UserPermission.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getAllUserPermissions = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await UserPermission.findAndCountAll({
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


module.exports = {
    createUserPermission,updateUserPermission,deleteUserPermission,getUserUserPermission,getAllUserPermissions
}