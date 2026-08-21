"use strict";

const { errorResponse, successResponse } = require("../../utils/responses");
const { AiReport, User, Business } = require("../../models");

const createReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { businessInfo, assessmentData, aiAnalysis, metadata, reportType } =
      req.body;

    let businessId = null;
    if (businessInfo?.uuid) {
      const business = await Business.findOne({
        where: { uuid: businessInfo.uuid },
        attributes: ["id"],
      });
      if (business) {
        businessId = business.id;
      }
    }

    const report = await AiReport.create({
      userId,
      businessId,
      reportType: reportType || "crat_analysis",
      businessInfo,
      assessmentData,
      aiAnalysis,
      metadata,
    });

    successResponse(res, report);
  } catch (error) {
    errorResponse(res, error);
  }
};

const listReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await AiReport.findAndCountAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Business,
          as: "Business",
          attributes: ["id", "uuid", "name"],
        },
      ],
      limit: parseInt(limit),
      offset,
    });

    successResponse(res, {
      reports: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { uuid } = req.params;

    const report = await AiReport.findOne({
      where: { uuid, userId },
      include: [
        {
          model: Business,
          as: "Business",
          attributes: ["id", "uuid", "name"],
        },
      ],
    });

    if (!report) {
      return res.status(404).json({
        status: false,
        message: "Report not found",
      });
    }

    successResponse(res, report);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { uuid } = req.params;

    const report = await AiReport.findOne({
      where: { uuid, userId },
    });

    if (!report) {
      return res.status(404).json({
        status: false,
        message: "Report not found",
      });
    }

    await report.destroy();
    successResponse(res, { deleted: true });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getReportStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const reports = await AiReport.findAll({
      where: { userId },
      attributes: ["id", "assessmentData", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    const totalReports = reports.length;
    const lastGenerated = reports.length > 0 ? reports[0].createdAt : null;

    let averageScore = 0;
    let readyBusinesses = 0;

    if (totalReports > 0) {
      const scores = reports.reduce((sum, report) => {
        const scoreData = report.assessmentData?.scoreData;
        if (scoreData) {
          const avg =
            ((scoreData.commercial?.percentage || 0) +
              (scoreData.financial?.percentage || 0) +
              (scoreData.operations?.percentage || 0) +
              (scoreData.legal?.percentage || 0)) /
            4;
          return sum + avg;
        }
        return sum;
      }, 0);

      averageScore = Math.round(scores / totalReports);
      readyBusinesses = reports.filter(
        (r) => r.assessmentData?.scoreData?.general_status === "Ready",
      ).length;
    }

    successResponse(res, {
      totalReports,
      lastGenerated,
      averageScore,
      readyBusinesses,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createReport,
  listReports,
  getReport,
  deleteReport,
  getReportStats,
};
