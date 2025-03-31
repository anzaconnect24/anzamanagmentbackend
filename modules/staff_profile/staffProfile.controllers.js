const { errorResponse, successResponse } = require("../../utils/responses");
const { StaffProfile, User } = require("../../models");

const createStaffProfile = async (req, res) => {
  try {
    const {
      user_uuid,
      title,
      department,
      yearOfEmployment,
      employeeID,
      supervisor,
    } = req.body;
    const user = await User.findOne({
      where: {
        uuid: user_uuid,
      },
    });
    const response = await StaffProfile.create({
      userId: user.id,
      title,
      department,
      yearOfEmployment,
      employeeID,
      supervisor,
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateStaffProfile = async (req, res) => {
  try {
    let { name } = req.body;
    const uuid = req.params.uuid;
    const staffprofile = await StaffProfile.findOne({
      where: {
        uuid,
      },
    });
    const response = await staffprofile.update({
      name,
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteStaffProfile = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const staffprofile = await StaffProfile.findOne({
      where: {
        uuid,
      },
    });
    const response = await staffprofile.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getStaffProfile = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const response = await StaffProfile.findAll({
      uuid,
    });

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createStaffProfile,
  updateStaffProfile,
  getStaffProfile,
  deleteStaffProfile,
};
