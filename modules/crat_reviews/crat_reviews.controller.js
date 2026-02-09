const { CratReview, User, Business, Notification } = require("../../models");
const { successResponse, errorResponse } = require("../../utils/responses");
const { Op } = require("sequelize");

class CratReviewController {
  // Create a new CRAT review (Entrepreneur submits for review)
  static async createCratReview(req, res) {
    try {
      const { entrepreneur_id } = req.body;

      // Check if entrepreneur already has ANY review (one-to-one relationship)
      const existingReview = await CratReview.findOne({
        where: {
          entrepreneur_id,
        },
      });

      if (existingReview) {
        return errorResponse(
          res,
          "You already have a CRAT review. Only one review per entrepreneur is allowed.",
        );
      }

      const cratReview = await CratReview.create({
        entrepreneur_id,
        status: "pending",
        submitted_at: new Date(),
      });

      // Create notification for admins
      const admins = await User.findAll({
        where: { role: "Admin" },
      });

      for (const admin of admins) {
        await Notification.create({
          user_id: admin.id,
          title: "New CRAT Review Application",
          message: `A new CRAT review has been submitted by an entrepreneur and needs assignment.`,
          type: "crat_review",
          reference_id: cratReview.uuid,
        });
      }

      const createdReview = await CratReview.findByPk(cratReview.id, {
        include: [
          {
            model: User,
            as: "entrepreneur",
            required: true,
          },
          {
            model: User,
            as: "reviewer",
            required: false,
          },
        ],
      });

      successResponse(res, createdReview);
    } catch (error) {
      console.error("Error creating CRAT review:", error);
      errorResponse(res, error.message);
    }
  }

  // Get all CRAT reviews (Admin view)
  static async getAllCratReviews(req, res) {
    try {
      const { page = 1, limit = 10, status, search } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (status) {
        whereCondition.status = status;
      }

      const include = [
        {
          model: User,
          as: "entrepreneur",
          required: true,
          include: [
            {
              model: Business,
              required: false, // Changed to false - entrepreneurs may not have Business yet
            },
          ],
          where: search
            ? {
                [Op.or]: [
                  { name: { [Op.iLike]: `%${search}%` } },
                  { email: { [Op.iLike]: `%${search}%` } },
                ],
              }
            : undefined,
        },
        {
          model: User,
          as: "reviewer",
          required: false, // Changed to false - pending reviews don't have reviewers
        },
      ];

      const { count, rows } = await CratReview.findAndCountAll({
        where: whereCondition,
        include,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      successResponse(res, {
        data: rows,
        count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
      });
    } catch (error) {
      console.error("Error fetching CRAT reviews:", error);
      errorResponse(res, error.message);
    }
  }

  // Get CRAT reviews by entrepreneur ID
  static async getCratReviewsByEntrepreneur(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows } = await CratReview.findAndCountAll({
        where: { entrepreneur_id: userId },
        include: [
          {
            model: User,
            as: "entrepreneur",
          },
          {
            model: User,
            as: "reviewer",
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      successResponse(res, {
        data: rows,
        count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
      });
    } catch (error) {
      console.error("Error fetching entrepreneur CRAT reviews:", error);
      errorResponse(res, error.message);
    }
  }

  // Get CRAT reviews assigned to reviewer
  static async getCratReviewsByReviewer(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows } = await CratReview.findAndCountAll({
        where: { reviewer_id: userId },
        include: [
          {
            model: User,
            as: "entrepreneur",
            include: [
              {
                model: Business,
                required: true,
              },
            ],
          },
          {
            model: User,
            as: "reviewer",
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      successResponse(res, {
        data: rows,
        count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
      });
    } catch (error) {
      console.error("Error fetching reviewer CRAT reviews:", error);
      errorResponse(res, error.message);
    }
  }

  // Get single CRAT review by UUID
  static async getCratReviewByUuid(req, res) {
    try {
      const { uuid } = req.params;

      const cratReview = await CratReview.findOne({
        where: { uuid },
        include: [
          {
            model: User,
            as: "entrepreneur",
          },
          {
            model: User,
            as: "reviewer",
          },
        ],
      });

      if (!cratReview) {
        return errorResponse(res, "CRAT review not found");
      }

      successResponse(res, cratReview);
    } catch (error) {
      console.error("Error fetching CRAT review:", error);
      errorResponse(res, error.message);
    }
  }

  // Assign reviewer to CRAT review (Admin action)
  static async assignReviewer(req, res) {
    try {
      const { uuid } = req.params;
      const { reviewer_id } = req.body;

      const cratReview = await CratReview.findOne({ where: { uuid } });
      if (!cratReview) {
        return errorResponse(res, "CRAT review not found");
      }

      if (cratReview.status !== "pending") {
        return errorResponse(res, "CRAT review is not in pending status");
      }

      await cratReview.update({
        reviewer_id,
        status: "assigned",
        assigned_at: new Date(),
      });

      // Create notification for reviewer
      await Notification.create({
        user_id: reviewer_id,
        title: "New CRAT Review Assignment",
        message: `You have been assigned a new CRAT review to evaluate.`,
        type: "crat_review_assignment",
        reference_id: cratReview.uuid,
      });

      const updatedReview = await CratReview.findOne({
        where: { uuid },
        include: [
          {
            model: User,
            as: "entrepreneur",
          },
          {
            model: User,
            as: "reviewer",
          },
        ],
      });

      successResponse(res, updatedReview);
    } catch (error) {
      console.error("Error assigning reviewer:", error);
      errorResponse(res, error.message);
    }
  }

  // Submit review (Staff/Reviewer action)
  static async submitReview(req, res) {
    try {
      const { uuid } = req.params;
      const { reviewer_comments, review_status } = req.body; // review_status: 'good' or 'bad'

      const cratReview = await CratReview.findOne({ where: { uuid } });
      if (!cratReview) {
        return errorResponse(res, "CRAT review not found");
      }

      if (!["assigned", "in_review"].includes(cratReview.status)) {
        return errorResponse(res, "CRAT review is not available for review");
      }

      await cratReview.update({
        reviewer_comments,
        status: "reviewed",
        reviewed_at: new Date(),
      });

      // Create notification for admins
      const admins = await User.findAll({
        where: { role: "Admin" },
      });

      for (const admin of admins) {
        await Notification.create({
          user_id: admin.id,
          title: "CRAT Review Completed",
          message: `A CRAT review has been completed by staff and needs final approval.`,
          type: "crat_review_completed",
          reference_id: cratReview.uuid,
        });
      }

      const updatedReview = await CratReview.findOne({
        where: { uuid },
        include: [
          {
            model: User,
            as: "entrepreneur",
          },
          {
            model: User,
            as: "reviewer",
          },
        ],
      });

      successResponse(res, updatedReview);
    } catch (error) {
      console.error("Error submitting review:", error);
      errorResponse(res, error.message);
    }
  }

  // Finalize review (Admin action)
  static async finalizeReview(req, res) {
    try {
      const { uuid } = req.params;
      const { admin_comments, final_status } = req.body; // final_status: 'accepted' or 'rejected'

      const cratReview = await CratReview.findOne({ where: { uuid } });
      if (!cratReview) {
        return errorResponse(res, "CRAT review not found");
      }

      if (cratReview.status !== "reviewed") {
        return errorResponse(res, "CRAT review is not ready for finalization");
      }

      await cratReview.update({
        admin_comments,
        status: final_status,
        finalized_at: new Date(),
      });

      // Create notification for entrepreneur
      await Notification.create({
        user_id: cratReview.entrepreneur_id,
        title: "CRAT Review Result",
        message: `Your CRAT review has been ${final_status}. Check the details for more information.`,
        type: "crat_review_result",
        reference_id: cratReview.uuid,
      });

      const updatedReview = await CratReview.findOne({
        where: { uuid },
        include: [
          {
            model: User,
            as: "entrepreneur",
          },
          {
            model: User,
            as: "reviewer",
          },
        ],
      });

      successResponse(res, updatedReview);
    } catch (error) {
      console.error("Error finalizing review:", error);
      errorResponse(res, error.message);
    }
  }

  // Update CRAT review
  static async updateCratReview(req, res) {
    try {
      const { uuid } = req.params;
      const updateData = req.body;

      const cratReview = await CratReview.findOne({ where: { uuid } });
      if (!cratReview) {
        return errorResponse(res, "CRAT review not found");
      }

      await cratReview.update(updateData);

      const updatedReview = await CratReview.findOne({
        where: { uuid },
        include: [
          {
            model: User,
            as: "entrepreneur",
          },
          {
            model: User,
            as: "reviewer",
          },
        ],
      });

      successResponse(res, updatedReview);
    } catch (error) {
      console.error("Error updating CRAT review:", error);
      errorResponse(res, error.message);
    }
  }

  // Delete CRAT review
  static async deleteCratReview(req, res) {
    try {
      const { uuid } = req.params;

      const cratReview = await CratReview.findOne({ where: { uuid } });
      if (!cratReview) {
        return errorResponse(res, "CRAT review not found");
      }

      await cratReview.destroy();
      successResponse(res, { message: "CRAT review deleted successfully" });
    } catch (error) {
      console.error("Error deleting CRAT review:", error);
      errorResponse(res, error.message);
    }
  }
}

module.exports = CratReviewController;
