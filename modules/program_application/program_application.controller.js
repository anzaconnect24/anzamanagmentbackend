const { errorResponse, successResponse } = require("../../utils/responses")
const getUrl = require("../../utils/cloudinary_upload");
const {ProgramApplication,ProgramApplicationReview, User,Business,Sequelize,ProgramRequirement,Program,ProgramApplicationDocument} = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const { where,Op } = require("sequelize");

const createProgramApplication = async(req,res)=>{
    try {
        let {program_uuid} = req.body
        const user = req.user
        const program = await Program.findOne({
            where:{uuid:program_uuid}
        })
        const response = await ProgramApplication.create({
            userId:user.id,
            programId:program.id
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}


const postProgramApplicationDocument = async (req, res) => {
  try {
    const user = req.user; // Move this line to after getting user object
    let program_application_uuid = req.params.uuid;
    let fileLink = null;
    let {
      program_requirement_uuid,
    } = req.body;
   
    if (req.file) {
      fileLink = await getUrl(req);
    }

    const program_application = await ProgramApplication.findOne({
      where: {
        uuid:program_application_uuid
      }
    });
    const program_requirement = await ProgramRequirement.findOne({
      where: {
        uuid:program_requirement_uuid
      }
    });

    const response = await ProgramApplicationDocument.create({
        programRequirementId:program_requirement.id,
        fileLink:fileLink,
        fileName:program_requirement.name,
        programApplicationId:program_application.id,
    });

    successResponse(res, response);
  } catch (error) {
    console.log(error);
    errorResponse(res, error);
  }
};


const getUserProgramApplication = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const user = req.user
        const program = await Program.findOne({
            where:{
                uuid
            }
        })
        const response = await ProgramApplication.findOne({
            [Op.and]:[{
                where:{
                    userId:user.id,

                },
               where: {
                programId:program.uuid
                }
            }],
            attributes:{
                exclude:["UserId","ProgramId","userId","programId"]
            },
           include:[{
            model:ProgramApplicationDocument
           },{
            model:Program,
            include:[ProgramRequirement]
           },
           {
            model:User,
            
           }
        ]
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
        const programApplication = await ProgramApplication.findOne({
            where:{
                uuid
            }
        });
        //find user
        const user = await User.findOne({
            where:{id:programApplication.userId}
        })
        sendEmail(req, res, user, status)
        const response = await programApplication.update(req.body)
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
            attributes:{
                exclude:['UserId','ProgramId']
            },
            include:{
                model: ProgramApplicationDocument,
                // required: true,
            }

        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getWaitingProgramApplications = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await ProgramApplication.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            // distinct:true,
            where:{status:'waiting'},
            include:[
                User,
                Program
            ]
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getAcceptedProgramApplications = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await ProgramApplication.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            // distinct:true,
            where:{status:'accepted'},
            include:[
                User,
                Program
            ]
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getRejectedProgramApplications = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await ProgramApplication.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            // distinct:true,
            where:{status:'rejected'},
            include:[
                User,
                Program
            ]
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
            attributes:{
                exclude:['userId','programId'],
            },
            include:[
                ProgramApplicationDocument,
                User,
                {
                    model:Program,
                    include:[ProgramRequirement]
                }
            ]
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
        const programApplication = await ProgramApplication.findOne({
            where:{
                uuid
            }
        })
        const {count, rows} = await User.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            
            where:{role:"Reviewer"},
            include:[{
                model:ProgramApplicationReview,
                where:{
                    programApplicationId:programApplication.id
                },
                required:true
            }],
            // include:{
            //     model: ProgramApplication,
            //     where:{uuid},
            //     // required: true
            // },
            // include:{
            //     model: ProgramApplication,
            //     // required: true
            // },
            attributes:{
                // exclude:["BusinessId"],
                include: [
                    [
                        Sequelize.literal(`EXISTS(
                            SELECT *
                            FROM ProgramApplicationReviews AS programApplicationReview
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
    getWaitingProgramApplications,getAcceptedProgramApplications,getRejectedProgramApplications,getProgramApplicationDetails,deleteProgramRequirement,postProgramApplicationDocument,
    
}