const { errorResponse, successResponse } = require("../../utils/responses")
const getUrl = require("../../utils/cloudinary_upload");
const {ProgramUpdate,User,Business,Sequelize,ProgramRequirement,Program,ProgramUpdateDocument} = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const { where } = require("sequelize");

const createProgramUpdate = async(req,res)=>{
    try {
        const user = req.user
        let image = null;
        let {program_uuid,title,description} = req.body
        const program = await Program.findOne({
            where:{uuid:program_uuid}
        })
        
        // if (req.file) {
        //     image = await getUrl(req);
        // }
        const response = await ProgramUpdate.create({
            programId:program.id,
            title:title,
            description:description,
            // image:image
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}


const postProgramUpdateDocument = async (req, res) => {
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

    const program_application = await ProgramUpdate.findOne({
      where: {
        uuid:program_application_uuid
      }
    });
    const program_requirement = await ProgramRequirement.findOne({
      where: {
        uuid:program_requirement_uuid
      }
    });

    const response = await ProgramUpdateDocument.create({
        programRequirementId:program_requirement.id,
        fileLink:fileLink,
        fileName:program_requirement.name,
        ProgramUpdateId:program_application.id,
    });

    successResponse(res, response);
  } catch (error) {
    console.log(error);
    errorResponse(res, error);
  }
};


const getUserProgramUpdate = async(req,res)=>{
    try {
        const user = req.user
        const response = await ProgramUpdate.findOne({
            where:{
                userId:user.id
            },
            include:{
                model: User,
                required: true
            }
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const updateProgramUpdate = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const ProgramUpdate = await ProgramUpdate.findOne({
            where:{
                uuid
            }
        });
        //find user
        const user = await User.findOne({
            where:{id:ProgramUpdate.userId}
        })
        sendEmail(req, res, user, status)
        const response = await ProgramUpdate.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteProgramUpdate = async(req,res)=>{
    try {
        let {
            name
        } = req.body;
        const uuid = req.params.uuid
        const programUpdate = await ProgramUpdate.findOne({
            where:{
                uuid
            }
        });
        const response = await programUpdate.destroy()
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

const getAllProgramUpdates = async(req, res) =>{
    // res.status(200).json({"k":"v"});

    const uuid = req.params.uuid;

    const program  = await Program.findOne({
        where:{
            uuid
        }
    })
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit
        const {count, rows} = await ProgramUpdate.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            where:{
               programId:program.id
            },
            include:{
                model: Program,
            }

        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getWaitingProgramUpdates = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await ProgramUpdate.findAndCountAll({
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

const getAcceptedProgramUpdates = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await ProgramUpdate.findAndCountAll({
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

const getRejectedProgramUpdates = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await ProgramUpdate.findAndCountAll({
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

const getProgramUpdateDetails = async(req, res) =>{
    try {
        const uuid = req.params.uuid

        const response = await ProgramUpdate.findOne({
            where:{uuid},
            attributes:{
                exclude:['userId','programId'],
            },
            include:[
                User,
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

        const {count, rows} = await User.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            distinct:true,
            where:{role:"Reviewer"},
            include:{
                model: ProgramUpdate,
                where:{uuid},
                required: true
            },
            // include:{
            //     model: ProgramUpdate,
            //     // required: true
            // },
            attributes:{
                // exclude:["BusinessId"],
                include: [
                    [
                        Sequelize.literal(`(
                            SELECT count(*)
                            FROM ProgramUpdateReview AS ProgramUpdateReview
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
    createProgramUpdate,updateProgramUpdate,deleteProgramUpdate,getUserProgramUpdate,getAllProgramUpdates,getReviewersStatus,
    getWaitingProgramUpdates,getAcceptedProgramUpdates,getRejectedProgramUpdates,getProgramUpdateDetails,deleteProgramRequirement,postProgramUpdateDocument,
    
}