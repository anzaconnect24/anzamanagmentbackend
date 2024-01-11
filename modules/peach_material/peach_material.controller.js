const { errorResponse, successResponse } = require("../../utils/responses")
const getUrl = require("../../utils/cloudinary_upload");
const {PeachMaterial,User,Business,Sequelize,ProgramRequirement,Program,PeachMaterialDocument} = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const { where } = require("sequelize");

const createPeachMaterial = async(req,res)=>{
    try {
        const user = req.user
        let link = null;
        let {fileName,type,description} = req.body
        // const program = await Program.findOne({
        //     where:{uuid:program_uuid}
        // })
        
        if (req.file) {
            link = await getUrl(req);
        }
        const response = await PeachMaterial.create({
            fileName:fileName,
            type:type,
            description:description,
            link:link
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}


const postPeachMaterialDocument = async (req, res) => {
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

    const program_application = await PeachMaterial.findOne({
      where: {
        uuid:program_application_uuid
      }
    });
    const program_requirement = await ProgramRequirement.findOne({
      where: {
        uuid:program_requirement_uuid
      }
    });

    const response = await PeachMaterialDocument.create({
        programRequirementId:program_requirement.id,
        fileLink:fileLink,
        fileName:program_requirement.name,
        PeachMaterialId:program_application.id,
    });

    successResponse(res, response);
  } catch (error) {
    console.log(error);
    errorResponse(res, error);
  }
};


const getUserPeachMaterial = async(req,res)=>{
    try {
        const user = req.user
        const response = await PeachMaterial.findOne({
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

const updatePeachMaterial = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {status} = req.body
        const PeachMaterial = await PeachMaterial.findOne({
            where:{
                uuid
            }
        });
        //find user
        const user = await User.findOne({
            where:{id:PeachMaterial.userId}
        })
        sendEmail(req, res, user, status)
        const response = await PeachMaterial.update(req.body)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deletePeachMaterial = async(req,res)=>{
    try {
        let {
            name
        } = req.body;
        const uuid = req.params.uuid
        const peachMaterial = await PeachMaterial.findOne({
            where:{
                uuid
            }
        });
        const response = await peachMaterial.destroy()
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

const getAllPeachMaterials = async(req, res) =>{
    // res.status(200).json({"k":"v"});
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await PeachMaterial.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            // distinct:true,

        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getWaitingPeachMaterials = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await PeachMaterial.findAndCountAll({
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

const getAcceptedPeachMaterials = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await PeachMaterial.findAndCountAll({
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

const getRejectedPeachMaterials = async(req, res) =>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await PeachMaterial.findAndCountAll({
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

const getPeachMaterialDetails = async(req, res) =>{
    try {
        const uuid = req.params.uuid

        const response = await PeachMaterial.findOne({
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
                model: PeachMaterial,
                where:{uuid},
                required: true
            },
            // include:{
            //     model: PeachMaterial,
            //     // required: true
            // },
            attributes:{
                // exclude:["BusinessId"],
                include: [
                    [
                        Sequelize.literal(`(
                            SELECT count(*)
                            FROM PeachMaterialReview AS PeachMaterialReview
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
    createPeachMaterial,updatePeachMaterial,deletePeachMaterial,getUserPeachMaterial,getAllPeachMaterials,getReviewersStatus,
    getWaitingPeachMaterials,getAcceptedPeachMaterials,getRejectedPeachMaterials,getPeachMaterialDetails,deleteProgramRequirement,postPeachMaterialDocument,
    
}