const { errorResponse, successResponse } = require("../../utils/responses");
const { MentorshipApplication, User,MentorProfile } = require("../../models");
const { Op } = require("sequelize");

const createMentorshipApplication = async (req, res) => {
  user = req.user;
  try {
    const {
      mentor_uuid,
      challenges,
      mentorshipAreas,
      mentorshipModes,
      availability,
    } = req.body;
    const mentor = await User.findOne({
      where: {
        uuid: mentor_uuid,
      },
    });

    const response = await MentorshipApplication.create({
      mentorId: mentor.id,
      entreprenuerId: req.user.id,
      challenges,
      mentorshipAreas,
      mentorshipModes,
      availability,
    });
    console.log(response);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getAllMentorshipApplications = async (req, res) => {
  try {
    const { count, rows } = await MentorshipApplication.findAndCountAll({
      offset: req.offset,
      limit: req.limit,
      order: [["createdAt", "DESC"]],
      attributes: {
        exclude: ["id"],
      },
    });
    successResponse(res, { count, data: rows, page: req.page });
  } catch (error) {
    errorResponse(res, error);
  }
};
const getEntreprenuerMentorshipApplications = async (req, res) => {
  try {
    const {uuid} = req.params;
    const user  = await User.findOne({
      where:{
        uuid
      }
    })
    const { count, rows } = await MentorshipApplication.findAndCountAll({
      offset: req.offset,
      limit: req.limit,
      order: [["createdAt", "DESC"]],
      include:[{
        model:User,
        as:"mentor",
        where:{
          name:{
            [Op.like]:`%${req.keyword}%`
          }
        },
        include:[MentorProfile]
      },
      {
        model:User,
        as:"entrepreneur",
        where:{
          id:user.id
        },
        required:true
      }],
      attributes: {
        exclude: ["id"],
      },
    });


    successResponse(res, { count, data: rows, page: req.page });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getMentorshipApplication = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const response = await MentorshipApplication.findOne({
      where: {
        uuid,
      },
      attributes: {
        exclude: ["id" /*,"uuid","name","createdAt","updatedAt"*/],
      },
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateMentorshipApplication = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const mentorshipapplication = await MentorshipApplication.findOne({
      where: {
        uuid,
      },
    });
    const response = await mentorshipapplication.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteMentorshipApplication = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const mentorshipApplication = await MentorshipApplication.findOne({
      where: {
        uuid,
      },
    });
    const response = await mentorshipApplication.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createMentorshipApplication,
  getMentorshipApplication,
  getAllMentorshipApplications,
  deleteMentorshipApplication,
  getEntreprenuerMentorshipApplications,
  updateMentorshipApplication,
};
