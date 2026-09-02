const { errorResponse, successResponse } = require("../../utils/responses");
const getUrl = require("../../utils/cloudinary_upload");
const { BusinessTool, Business, BusinessSector } = require("../../models");
const { generateStructuredContent } = require("./business_tools_ai_service");

// The subset of Business fields useful as AI context — not every column
// (e.g. internal ids, review status, social links) belongs in a generation
// prompt. Kept as a plain list so it's easy to see exactly what's sent.
const BUSINESS_CONTEXT_FIELDS = [
  "name",
  "description",
  "problem",
  "solution",
  "market",
  "stage",
  "revenue",
  "traction",
  "numberOfCustomers",
  "team",
  "growthPlan",
  "fundraisingNeeds",
  "impact",
  "location",
];

// Minimal per-user cooldown for AI generation — each attempt costs a real
// OpenAI request once a key is configured, and nothing else in this backend
// throttles repeat calls. In-memory only (resets on restart, fine for this
// single-process backend); intentionally not a full rate limiter — see
// PHASE 5 investigation notes. Only gates the actual generation attempt
// below, not the 404/403 validation branches above it.
const GENERATION_COOLDOWN_MS = 15000;
const lastGenerationAttemptByUser = new Map();

// Create a new business tool
const createBusinessTool = async (req, res) => {
  try {
    const {
      fileName,
      description,
      fileUrl,
      fileType,
      fileSize,
      category,
      thumbnailUrl,
      aiEnabled,
      aiPrompt,
    } = req.body;

    const response = await BusinessTool.create({
      fileName,
      description,
      fileUrl,
      fileType,
      fileSize,
      category,
      thumbnailUrl,
      aiEnabled: Boolean(aiEnabled),
      aiPrompt: aiEnabled ? aiPrompt : null,
    });

    successResponse(res, response);
  } catch (error) {
    console.error("Error creating business tool:", error);
    errorResponse(res, error);
  }
};

// Get all business tools
const getAllBusinessTools = async (req, res) => {
  try {
    const response = await BusinessTool.findAll({
      order: [["createdAt", "DESC"]],
    });

    successResponse(res, response);
  } catch (error) {
    console.error("Error fetching business tools:", error);
    errorResponse(res, error);
  }
};

// Get a single business tool by UUID
const getBusinessTool = async (req, res) => {
  try {
    const { uuid } = req.params;

    const response = await BusinessTool.findOne({
      where: { uuid },
    });

    if (!response) {
      return res.status(404).json({
        status: false,
        message: "Business tool not found",
      });
    }

    successResponse(res, response);
  } catch (error) {
    console.error("Error fetching business tool:", error);
    errorResponse(res, error);
  }
};

// Update a business tool
const updateBusinessTool = async (req, res) => {
  try {
    const { uuid } = req.params;
    const {
      fileName,
      description,
      fileUrl,
      fileType,
      fileSize,
      category,
      thumbnailUrl,
      aiEnabled,
      aiPrompt,
    } = req.body;

    const businessTool = await BusinessTool.findOne({
      where: { uuid },
    });

    if (!businessTool) {
      return res.status(404).json({
        status: false,
        message: "Business tool not found",
      });
    }

    const response = await businessTool.update({
      fileName,
      description,
      fileUrl,
      fileType,
      fileSize,
      category,
      thumbnailUrl,
      aiEnabled: Boolean(aiEnabled),
      aiPrompt: aiEnabled ? aiPrompt : null,
    });

    successResponse(res, response);
  } catch (error) {
    console.error("Error updating business tool:", error);
    errorResponse(res, error);
  }
};

// Delete a business tool
const deleteBusinessTool = async (req, res) => {
  try {
    const { uuid } = req.params;

    const businessTool = await BusinessTool.findOne({
      where: { uuid },
    });

    if (!businessTool) {
      return res.status(404).json({
        status: false,
        message: "Business tool not found",
      });
    }

    await businessTool.destroy();

    successResponse(res, { message: "Business tool deleted successfully" });
  } catch (error) {
    console.error("Error deleting business tool:", error);
    errorResponse(res, error);
  }
};

// Generate AI content for an AI-enabled business tool, using the
// authenticated user's own business data plus whatever additional
// information they supplied for this generation. Nothing here is persisted —
// the result is returned directly to the caller.
const generateBusinessTool = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { additionalInputs } = req.body;

    const tool = await BusinessTool.findOne({ where: { uuid } });
    if (!tool) {
      return res.status(404).json({
        status: false,
        message: "Business tool not found",
      });
    }

    // Never trust the frontend's own check — the button is only hidden
    // client-side, this is the real gate.
    if (!tool.aiEnabled) {
      return res.status(403).json({
        status: false,
        message: "AI generation is not enabled for this business tool",
      });
    }

    // Derived from the authenticated user only — a businessId in the request
    // body/query is never accepted, so one user can't generate content using
    // another user's business data. Mirrors business.controller.js's
    // getUserBusiness exactly, including its unordered findOne (there is no
    // uniqueness constraint on Business.userId; this matches existing
    // behavior rather than introducing a new assumption).
    const business = await Business.findOne({
      where: { userId: req.user.id },
      include: [{ model: BusinessSector, attributes: ["name"] }],
    });

    if (!business) {
      return res.status(404).json({
        status: false,
        message:
          "No business profile found for this account. Complete your business profile before generating with AI.",
      });
    }

    const businessContext = {};
    BUSINESS_CONTEXT_FIELDS.forEach((field) => {
      const value = business[field];
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        businessContext[field] = value;
      }
    });
    if (business.BusinessSector?.name) {
      businessContext.sector = business.BusinessSector.name;
    }

    const now = Date.now();
    const lastAttempt = lastGenerationAttemptByUser.get(req.user.id);
    if (lastAttempt && now - lastAttempt < GENERATION_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil(
        (GENERATION_COOLDOWN_MS - (now - lastAttempt)) / 1000,
      );
      return res.status(429).json({
        status: false,
        message: `Please wait ${retryAfterSeconds}s before generating again.`,
      });
    }
    lastGenerationAttemptByUser.set(req.user.id, now);

    const systemInstructions = [
      "You are an expert business advisor helping an entrepreneur generate a business document.",
      "Use only the business information and additional information explicitly provided to you.",
      "Do not invent specific facts such as revenue figures, customer counts, funding amounts, registration details, or achievements that were not provided.",
      "Where information relevant to the document is missing, note that generically rather than fabricating specifics.",
      "Follow the administrator's template-specific instructions closely.",
      'Respond with a single JSON object only, matching this exact shape: { "title": string, "summary": string, "sections": [{ "heading": string, "content": string }] }. Do not include any text outside the JSON object.',
    ].join(" ");

    const hasAdditionalInputs =
      additionalInputs &&
      typeof additionalInputs === "object" &&
      Object.keys(additionalInputs).length > 0;

    const userPromptParts = [
      `TEMPLATE: ${tool.fileName}`,
      tool.category ? `CATEGORY: ${tool.category}` : null,
      tool.description ? `TEMPLATE DESCRIPTION: ${tool.description}` : null,
      `ADMIN INSTRUCTIONS:\n${tool.aiPrompt}`,
      `BUSINESS INFORMATION:\n${JSON.stringify(businessContext, null, 2)}`,
      hasAdditionalInputs
        ? `ADDITIONAL INFORMATION PROVIDED BY THE USER:\n${JSON.stringify(additionalInputs, null, 2)}`
        : null,
    ].filter(Boolean);

    const result = await generateStructuredContent({
      systemInstructions,
      userPrompt: userPromptParts.join("\n\n"),
    });

    successResponse(res, result);
  } catch (error) {
    if (error.code === "AI_NOT_CONFIGURED") {
      return res.status(503).json({ status: false, message: error.message });
    }
    if (error.code === "AI_INVALID_RESPONSE") {
      console.error("AI generation returned invalid JSON:", error.raw);
      return res.status(502).json({
        status: false,
        message: "AI generation failed — please try again",
      });
    }
    console.error("Error generating business tool content:", error);
    errorResponse(res, error);
  }
};

module.exports = {
  createBusinessTool,
  getAllBusinessTools,
  getBusinessTool,
  updateBusinessTool,
  deleteBusinessTool,
  generateBusinessTool,
};
