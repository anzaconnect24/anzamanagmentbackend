const db = require("../../models");
const { ProgramApplication } = db;

// Create a new program application
exports.createProgramApplication = async (req, res) => {
  try {
    const { title, description, url, image, expireDate } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const programApplication = await ProgramApplication.create({
      title,
      description,
      url,
      image,
      expireDate: expireDate ? new Date(expireDate) : null,
    });

    res.status(201).json({
      success: true,
      message: "Program application created successfully",
      data: programApplication,
    });
  } catch (error) {
    console.error("Error creating program application:", error);
    res.status(500).json({
      success: false,
      message: "Error creating program application",
      error: error.message,
    });
  }
};

// Get all program applications
exports.getAllProgramApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10, includeExpired = false } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    // Filter out expired applications unless specifically requested
    if (!includeExpired || includeExpired === "false") {
      whereClause.expireDate = {
        [db.Sequelize.Op.or]: [
          { [db.Sequelize.Op.gte]: new Date() },
          { [db.Sequelize.Op.eq]: null },
        ],
      };
    }

    const { count, rows } = await ProgramApplication.findAndCountAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching program applications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching program applications",
      error: error.message,
    });
  }
};

// Get a single program application by UUID
exports.getProgramApplicationByUuid = async (req, res) => {
  try {
    const { uuid } = req.params;

    const programApplication = await ProgramApplication.findOne({
      where: { uuid },
    });

    if (!programApplication) {
      return res.status(404).json({
        success: false,
        message: "Program application not found",
      });
    }

    res.status(200).json({
      success: true,
      data: programApplication,
    });
  } catch (error) {
    console.error("Error fetching program application:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching program application",
      error: error.message,
    });
  }
};

// Update a program application
exports.updateProgramApplication = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { title, description, url, image, expireDate } = req.body;

    const programApplication = await ProgramApplication.findOne({
      where: { uuid },
    });

    if (!programApplication) {
      return res.status(404).json({
        success: false,
        message: "Program application not found",
      });
    }

    await programApplication.update({
      title: title !== undefined ? title : programApplication.title,
      description:
        description !== undefined
          ? description
          : programApplication.description,
      url: url !== undefined ? url : programApplication.url,
      image: image !== undefined ? image : programApplication.image,
      expireDate:
        expireDate !== undefined
          ? expireDate
            ? new Date(expireDate)
            : null
          : programApplication.expireDate,
    });

    res.status(200).json({
      success: true,
      message: "Program application updated successfully",
      data: programApplication,
    });
  } catch (error) {
    console.error("Error updating program application:", error);
    res.status(500).json({
      success: false,
      message: "Error updating program application",
      error: error.message,
    });
  }
};

// Delete a program application
exports.deleteProgramApplication = async (req, res) => {
  try {
    const { uuid } = req.params;

    const programApplication = await ProgramApplication.findOne({
      where: { uuid },
    });

    if (!programApplication) {
      return res.status(404).json({
        success: false,
        message: "Program application not found",
      });
    }

    await programApplication.destroy();

    res.status(200).json({
      success: true,
      message: "Program application deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting program application:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting program application",
      error: error.message,
    });
  }
};
