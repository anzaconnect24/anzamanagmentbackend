const { errorResponse, successResponse } = require("../../utils/responses")
const {Role,User} = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const createRole = async(req,res)=>{
    try {
        const {
            name,
            description,
        } = req.body;
        
        const user = req.user
        const role = await Role.findOne({
            where:{
                name
            }
        })
        if (role) {
            res.status(403).json({
            status: false,
            message: "Role already created1!"
            });
        }else{
            const response = await Role.create({
                name,
                description,
            })
            successResponse(res,response)
        }
    } catch (error) {
        errorResponse(res,error)
    }
}

const getUserRole = async(req,res)=>{
    try {
        const user = req.user
        const response = await Role.findOne({
            where:{
                userId:user.id
            }
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const updateRole = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const Role = await Role.findOne({
            where:{
                uuid
            }
        });
        //find user
        const user = await User.findOne({
            where:{id:Role.userId}
        })
        sendEmail(req, res, user, status)
        const response = await Role.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteRole = async(req,res)=>{
    try {
        let {
            name
        } = req.body;
        const uuid = req.params.uuid
        const Role = await Role.findOne({
            where:{
                uuid
            }
        });
        const response = await Role.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getAllRoles = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await Role.findAndCountAll({
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


module.exports = {
    createRole,updateRole,deleteRole,getUserRole,getAllRoles
}