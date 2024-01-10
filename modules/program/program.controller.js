const { errorResponse, successResponse } = require("../../utils/responses")
const {Program,User,Business,Sequelize,ProgramRequirement} = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const programrequirement = require("../../models/programrequirement");

const createProgram = async(req,res)=>{
    try {
        const {title,type,requirements} = req.body
    // res.status(200).json({"body":type})
        var response = await Program.create({title:title,type:type})
        let programrequirements = requirements.map((item)=>{
            return { 
                name:item,
                programId:response.id
            }
        })
        response = await ProgramRequirement.bulkCreate(programrequirements)            
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getUserProgram = async(req,res)=>{
    try {
        const user = req.user
        const response = await Program.findOne({
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

const updateProgram = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const Program = await Program.findOne({
            where:{
                uuid
            }
        });
        //find user
        const user = await User.findOne({
            where:{id:Program.userId}
        })
        sendEmail(req, res, user, status)
        const response = await Program.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteProgram = async(req,res)=>{
    try {
        let {
            name
        } = req.body;
        const uuid = req.params.uuid
        const Program = await Program.findOne({
            where:{
                uuid
            }
        });
        const response = await Program.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getAllPrograms = async(req, res) =>{
    // res.status(200).json({"k":"v"});
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await Program.findAndCountAll({
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
                model: Program,
                // required: true
            },
            attributes:{
                // exclude:["BusinessId"],

                // program: title,type,
                // programrequirement: name,programid
                // return program + programrequirement
                // programapplication: userid,programid,status(wait/reje/acce)
                // programappliccationdocument: programapplicationid,filelink,filename
                // programapplicationreview: programapplicationid,status,userid,feedback

                include: [
                    [
                        // SELECT userId
                        Sequelize.literal(`(
                            SELECT count(*)
                            FROM Programs AS Program
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
    createProgram,updateProgram,deleteProgram,getUserProgram,getAllPrograms,getReviewersStatus
}