const { errorResponse, successResponse } = require("../../utils/responses");
const getUrl = require("../../utils/cloudinary_upload");
const {
  PitchMaterial,
  User,
  Business,
  Sequelize,
  ProgramRequirement,
  Program,
  PitchMaterialDocument,
  PitchMaterialViewer,
} = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const { where } = require("sequelize");

const createPitchMaterial = async (req, res) => {
  try {
    let { fileName, type, description, materialUrl, thumbnailUrl, category } =
      req.body;
    const response = await PitchMaterial.create({
      fileName: fileName,
      type: type,
      description: description,
      materialUrl,
      thumbnailUrl,
      category,
    });
    successResponse(res, response);
  } catch (error) {
    console.log(error);
    errorResponse(res, error);
  }
};

const postPitchMaterialDocument = async (req, res) => {
  try {
    const user = req.user; // Move this line to after getting user object
    let program_application_uuid = req.params.uuid;
    let fileLink = null;
    let { program_requirement_uuid } = req.body;

    if (req.file) {
      fileLink = await getUrl(req);
    }

    const program_application = await PitchMaterial.findOne({
      where: {
        uuid: program_application_uuid,
      },
    });
    const program_requirement = await ProgramRequirement.findOne({
      where: {
        uuid: program_requirement_uuid,
      },
    });

    const response = await PitchMaterialDocument.create({
      programRequirementId: program_requirement.id,
      fileLink: fileLink,
      fileName: program_requirement.name,
      PitchMaterialId: program_application.id,
    });

    successResponse(res, response);
  } catch (error) {
    console.log(error);
    errorResponse(res, error);
  }
};

const getUserPitchMaterial = async (req, res) => {
  try {
    const user = req.user;
    const response = await PitchMaterial.findOne({
      where: {
        userId: user.id,
      },
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updatePitchMaterial = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const { status } = req.body;
    const PitchMaterial = await PitchMaterial.findOne({
      where: {
        uuid,
      },
    });
    //find user
    const user = await User.findOne({
      where: { id: PitchMaterial.userId },
    });
    sendEmail(req, res, user, status);
    const response = await PitchMaterial.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deletePitchMaterial = async (req, res) => {
  try {
    let { name } = req.body;
    const uuid = req.params.uuid;
    const pitchMaterial = await PitchMaterial.findOne({
      where: {
        uuid,
      },
    });
    const response = await pitchMaterial.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const addPitchMaterialViewer = async (req, res) => {
  try {
    let { user_uuid } = req.body;
    const uuid = req.params.uuid;
    const user = await User.findOne({
      where: {
        uuid: user_uuid,
      },
    });
    const pitchMaterial = await PitchMaterial.findOne({
      where: {
        uuid,
      },
    });
    const response = await PitchMaterialViewer.create({
      userId: user.id,
      pitchMaterialId: pitchMaterial.id,
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};
const deletePitchMaterialViewer = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const pitchMaterialViewer = await PitchMaterialViewer.findOne({
      where: {
        uuid,
      },
    });
    const response = await pitchMaterialViewer.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getAllPitchMaterials = async (req, res) => {
  // res.status(200).json({"k":"v"});
  try {
    let { page, limit } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await PitchMaterial.findAndCountAll({
      offset: offset, //ruka ngapi
      limit: limit, //leta ngapi
      order: [["createdAt", "DESC"]],
      // distinct:true,
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getVideoPitchMaterials = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await PitchMaterial.findAndCountAll({
      offset: offset, //ruka ngapi
      limit: limit, //leta ngapi
      order: [["createdAt", "DESC"]],
      where: { type: "video" },
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getDocumentPitchMaterials = async (req, res) => {
  try {
   
    const response= await PitchMaterial.findAll({
      order: [["createdAt", "DESC"]],
      where: { type: "document" },
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createPitchMaterial,
  updatePitchMaterial,
  deletePitchMaterial,
  getUserPitchMaterial,
  getAllPitchMaterials,
  addPitchMaterialViewer,
  getVideoPitchMaterials,
  getDocumentPitchMaterials,
  postPitchMaterialDocument,
  deletePitchMaterialViewer,
};
