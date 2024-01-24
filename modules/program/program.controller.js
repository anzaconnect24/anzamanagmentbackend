const { errorResponse, successResponse } = require("../../utils/responses")
const {Program,User,Business,Sequelize,ProgramRequirement} = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const createProgram = async(req,res)=>{
    try {
        const {title,type,description,requirements} = req.body
        // res.status(200).json({"body":type})
        var response = await Program.create({title:title,type:type,description:description})
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

const addProgramRequirements = async(req,res)=>{
    try {
        const {requirements} = req.body
        const uuid = req.params.uuid
        const program = await Program.findOne({
            where:{
                uuid
            }
        });
        let programrequirements = requirements.map((item)=>{
            return { 
                name:item,
                programId:program.id
            }
        })
        let response = await ProgramRequirement.bulkCreate(programrequirements)   
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const updateProgram = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const program = await Program.findOne({
            where:{
                uuid
            }
        });
        //find user
     
        if(status){
            const user = await User.findOne({
                where:{id:program.userId}
            })
            sendEmail(req, res, user, status)
        }
        const response = await program.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteProgram = async(req,res)=>{
    try {
     
        const uuid = req.params.uuid
        const program = await Program.findOne({
            where:{
                uuid
            }
        });
        const response = await program.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteProgramRequirement = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const programRequirement = await ProgramRequirement.findOne({
            where:{
                uuid
            }
        });
        const response = await programRequirement.destroy()
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
            order:[['createdAt','DESC']],
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

const getBfaPrograms = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit
        let user = req.user

        const {count, rows} = await Program.findAndCountAll({
            order:[['createdAt', 'DESC']],
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:[['createdAt','DESC']],
            // distinct:true,
            where:{type:'bfa'},
            include:{
                model: ProgramRequirement,
                // required: true,
            },
            attributes:{
                include: [
                    [
                        Sequelize.literal(`EXISTS(
                            SELECT *
                            FROM ProgramApplications AS programApplication
                            WHERE
                                userId = ${user.id} AND
                                programId = Program.id
                        )`),
                        'applied'
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

const getIraPrograms = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit
        let user = req.user

        const {count, rows} = await Program.findAndCountAll({
            order:[['createdAt', 'DESC']],
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:[['createdAt','DESC']],
            // distinct:true,
            where:{type:'ira'},
            include:{
                model: ProgramRequirement,
                // required: true,
            },
            attributes:{
                include: [
                    [
                        Sequelize.literal(`EXISTS(
                            SELECT *
                            FROM ProgramApplications AS programApplication
                            WHERE
                                userId = ${user.id} AND
                                programId = Program.id
                        )`),
                        'applied'
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

const getProgramDetails = async(req, res) =>{
    try {
        const uuid = req.params.uuid
        let user = req.user

        const response = await Program.findOne({
            where:{uuid},
            include:{
                model: ProgramRequirement,
                // required: true,
            },
            attributes:{
                include: [
                    [
                        Sequelize.literal(`EXISTS(
                            SELECT *
                            FROM ProgramApplications AS programApplication
                            WHERE
                                userId = ${user.id} AND
                                programId = Program.id
                        )`),
                        'applied'
                    ],
                ],
            },
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
            order:[['createdAt','DESC']],
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
    createProgram,updateProgram,deleteProgram,getUserProgram,getAllPrograms,getReviewersStatus,
    getBfaPrograms,getIraPrograms,getProgramDetails,deleteProgramRequirement,addProgramRequirements,
}