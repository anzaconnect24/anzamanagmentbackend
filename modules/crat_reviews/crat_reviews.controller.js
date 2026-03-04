const { CratReview, User, Business, Notification } = require("../../models");
const { successResponse, errorResponse } = require("../../utils/responses");
const { Op } = require("sequelize");

class CratReviewController {
  // Create a new CRAT review (Entrepreneur submits for review)
  static async createCratReview(req, res) {
    try {
      const { entrepreneur_id } = req.body;

      // Fetch all existing reviews for this entrepreneur
      const allReviews = await CratReview.findAll({
        where: { entrepreneur_id },
        order: [["createdAt", "DESC"]],
      });

      // Block if there is already an active (non-terminal) review
      const activeReview = allReviews.find((r) =>
        ["pending", "assigned", "in_review"].includes(r.status),
      );
      if (activeReview) {
        return errorResponse(
          res,
          "You already have an active CRAT review in progress. Please wait for it to be completed before starting a new version.",
        );
      }

      // If there are previous reviews, enforce a 30-day cooldown from the last terminal date
      if (allReviews.length > 0) {
        const latestReview = allReviews[0]; // already sorted DESC
        const terminalDate =
          latestReview.finalized_at || latestReview.reviewed_at;

        if (terminalDate) {
          const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
          const elapsed = Date.now() - new Date(terminalDate).getTime();
          if (elapsed < THIRTY_DAYS_MS) {
            const daysLeft = Math.ceil(
              (THIRTY_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000),
            );
            return errorResponse(
              res,
              `You must wait ${daysLeft} more day(s) before starting a new version cycle (30-day cooldown applies).`,
            );
          }
        }
      }

      // Determine the next version number
      const nextVersion = allReviews.length + 1;

      const cratReview = await CratReview.create({
        entrepreneur_id,
        version: nextVersion,
        status: "pending",
        submitted_at: new Date(),
      });

      // If this is a new version (not the first), reset the entrepreneur's publishStatus to "Draft"
      if (nextVersion > 1) {
        await User.update(
          { publishStatus: "Draft" },
          { where: { id: entrepreneur_id } },
        );
      }

      // Create notification for admins
      const admins = await User.findAll({
        where: { role: "Admin" },
      });

      for (const admin of admins) {
        await Notification.create({
          user_id: admin.id,
          title: "New CRAT Review Application",
          message: `A new CRAT review (Version ${nextVersion}) has been submitted by an entrepreneur and needs assignment.`,
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

      // Add search condition using nested field syntax
      if (search) {
        whereCondition[Op.or] = [
          { "$entrepreneur.name$": { [Op.like]: `%${search}%` } },
          { "$entrepreneur.email$": { [Op.like]: `%${search}%` } },
          { "$entrepreneur.Business.name$": { [Op.like]: `%${search}%` } },
        ];
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

      // Set the entrepreneur's publishStatus to "Reviewed" so PDF becomes available
      await User.update(
        { publishStatus: "Reviewed" },
        { where: { id: cratReview.entrepreneur_id } },
      );

      // Notify the entrepreneur that their review is complete
      await Notification.create({
        user_id: cratReview.entrepreneur_id,
        title: "CRAT Review Completed",
        message: `Your CRAT review (Version ${cratReview.version}) has been completed by a reviewer. You can now download your Capital Readiness Assessment Report.`,
        type: "crat_review_completed",
        reference_id: cratReview.uuid,
      });

      // Create notification for admins
      const admins = await User.findAll({
        where: { role: "Admin" },
      });

      for (const admin of admins) {
        await Notification.create({
          user_id: admin.id,
          title: "CRAT Review Completed",
          message: `A CRAT review (Version ${cratReview.version}) has been completed by staff and needs final approval.`,
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
