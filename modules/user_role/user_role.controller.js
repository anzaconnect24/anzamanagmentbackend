const { errorResponse, successResponse } = require("../../utils/responses")
const {UserRole,User,Role} = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const createUserRole = async(req,res)=>{
    try {
        const {
            user_uuid,
            role_uuid,
        } = req.body;
        
        // const user = req.user
        const user = await User.findOne({
            where:{
                uuid:user_uuid
            }
        })
        const role = await Role.findOne({
            where:{
                uuid:role_uuid
            }
        })
        const userRole = await UserRole.findOne({
            where:{
                userId:user.id,
                roleId:role.id,
            }
        })
        if (userRole) {
            res.status(403).json({
            status: false,
            message: "UserRole already created1!"
            });
        }else{
            const response = await UserRole.create({
                userId:user.id,
                roleId:role.id,
            })
            successResponse(res,response)
        }
    } catch (error) {
        errorResponse(res,error)
    }
}

const getUserUserRole = async(req,res)=>{
    try {
        const user = req.user
        const response = await UserRole.findOne({
            where:{
                userId:user.id
            }
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const updateUserRole = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const UserRole = await UserRole.findOne({
            where:{
                uuid
            }
        });
        //find user
        const user = await User.findOne({
            where:{id:UserRole.userId}
        })
        sendEmail(req, res, user, status)
        const response = await UserRole.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteUserRole = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const UserRole = await UserRole.findOne({
            where:{
                uuid
            }
        });
        const response = await UserRole.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getAllUserRoles = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await UserRole.findAndCountAll({
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
    createUserRole,updateUserRole,deleteUserRole,getUserUserRole,getAllUserRoles
}