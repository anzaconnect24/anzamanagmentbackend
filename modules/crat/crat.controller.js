const { Op } = require("sequelize");
const { errorResponse, successResponse } = require("../../utils/responses");
const getUrl = require("../../utils/cloudinary_upload");
const OpenAI = require("openai");
const {
  Business,
  BusinessSector,
  CratQuestionCatalog,
  CratAssessment,
  CratAnswer,
  CratScoreSnapshot,
  CratAssessmentReviewer,
  User,
  sequelize,
} = require("../../models");

const DOMAIN_WEIGHTS = {
  commercial_marketing: 0.25,
  financial: 0.35,
  legal_compliance: 0.25,
  operations: 0.15,
};

const VALID_DOMAINS = Object.keys(DOMAIN_WEIGHTS);

const isAdmin = (role) => role === "Admin";
const isReviewer = (role) => role === "Staff";
const isEntrepreneur = (role) => role === "Enterprenuer";

const ensureRole = (res, predicate, message) => {
  if (!predicate) {
    res.status(403).json({ status: false, message });
    return false;
  }
  return true;
};

const isFintechSector = (...values) => {
  const text = values
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .join(" ");

  if (!text) return false;

  if (text.includes("fintech") || text.includes("fin-tech")) return true;
  if (text.includes("financial technology")) return true;
  if (text.includes("financial") && text.includes("technology")) return true;

  return false;
};

const resolveLegalVariant = async (businessId) => {
  const business = await Business.findByPk(businessId, {
    attributes: ["name", "otherIndustry", "description"],
    include: [{ model: BusinessSector, attributes: ["name"] }],
  });

  if (!business) return "default";

  const sectorName = business.BusinessSector?.name || "";
  const otherIndustry = business.otherIndustry || "";
  const businessName = business.name || "";
  const description = business.description || "";

  return isFintechSector(sectorName, otherIndustry, businessName, description)
    ? "fintech"
    : "default";
};

const getOrCreateAssessment = async (businessId, entrepreneurId) => {
  let assessment = await CratAssessment.findOne({
    where: {
      business_id: businessId,
      entrepreneur_id: entrepreneurId,
      status: {
        [Op.notIn]: ["published"],
      },
    },
    order: [["createdAt", "DESC"]],
  });

  if (!assessment) {
    assessment = await CratAssessment.create({
      business_id: businessId,
      entrepreneur_id: entrepreneurId,
      status: "draft",
    });
  }

  return assessment;
};

const computeAssessmentScores = async (assessmentId) => {
  const questions = await CratQuestionCatalog.findAll({
    where: { is_active: true },
    attributes: ["id", "domain"],
  });

  const questionMap = new Map();
  for (const q of questions) {
    questionMap.set(q.id, q.domain);
  }

  const answers = await CratAnswer.findAll({
    where: { assessment_id: assessmentId },
    attributes: ["question_id", "score"],
  });

  const domainBuckets = {
    commercial_marketing: [],
    financial: [],
    legal_compliance: [],
    operations: [],
  };

  const scoreDistribution = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  for (const answer of answers) {
    const domain = questionMap.get(answer.question_id);
    if (!domain || !VALID_DOMAINS.includes(domain)) continue;

    const score = Number(answer.score || 0);
    if (scoreDistribution[score] !== undefined) {
      scoreDistribution[score] += 1;
    }

    if (score >= 1 && score <= 5) {
      domainBuckets[domain].push(score);
    }
  }

  const domainScores = {};
  let weightedRaw = 0;
  let reviewedWeight = 0;

  for (const domain of VALID_DOMAINS) {
    const reviewedScores = domainBuckets[domain];
    const reviewedQuestions = reviewedScores.length;
    const totalQuestions = questions.filter((q) => q.domain === domain).length;

    const average =
      reviewedQuestions > 0
        ? reviewedScores.reduce((acc, val) => acc + val, 0) / reviewedQuestions
        : 0;

    const weight = DOMAIN_WEIGHTS[domain];
    const reviewed = reviewedQuestions > 0;

    if (reviewed) {
      weightedRaw += average * weight;
      reviewedWeight += weight;
    }

    domainScores[domain] = {
      average,
      weight,
      weightedContribution: reviewed ? average * weight : 0,
      reviewed,
      reviewedQuestions,
      totalQuestions,
    };
  }

  const incomplete = reviewedWeight < 1;
  const overallScore5 = reviewedWeight > 0 ? weightedRaw / reviewedWeight : 0;
  const overallPercent = overallScore5 * 20;

  const reviewedQuestionsTotal = Object.values(domainScores).reduce(
    (acc, item) => acc + item.reviewedQuestions,
    0,
  );
  const totalQuestions = Object.values(domainScores).reduce(
    (acc, item) => acc + item.totalQuestions,
    0,
  );

  return {
    domainScores,
    overallScore5,
    overallPercent,
    incomplete,
    reviewedQuestionsTotal,
    totalQuestions,
    reviewedDomains: Object.values(domainScores).filter((d) => d.reviewed)
      .length,
    totalDomains: VALID_DOMAINS.length,
    scoreDistribution,
  };
};

const buildReportPayload = async (businessId, assessmentId) => {
  const summary = await computeAssessmentScores(assessmentId);

  const snapshots = await CratScoreSnapshot.findAll({
    include: [
      {
        model: CratAssessment,
        attributes: ["status", "published_at"],
        where: { business_id: businessId, status: "published" },
      },
    ],
    order: [["generated_at", "ASC"]],
  });

  const trend = snapshots.map((snapshot) => ({
    date: snapshot.generated_at,
    score5: snapshot.overall_score_5,
    percent: snapshot.overall_percent,
  }));

  const weightedContribution = VALID_DOMAINS.map((domain) => ({
    domain,
    value: summary.domainScores[domain].weightedContribution,
    average: summary.domainScores[domain].average,
    weight: summary.domainScores[domain].weight,
  }));

  return {
    ...summary,
    weightedContribution,
    trend,
  };
};

const getCatalog = async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const variant = await resolveLegalVariant(businessId);

    const questions = await CratQuestionCatalog.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { domain: { [Op.ne]: "legal_compliance" } },
          { domain: "legal_compliance", variant },
        ],
      },
      order: [
        ["domain", "ASC"],
        ["sort_order", "ASC"],
      ],
    });

    const grouped = VALID_DOMAINS.reduce((acc, domain) => {
      acc[domain] = [];
      return acc;
    }, {});

    for (const q of questions) {
      grouped[q.domain].push({
        id: q.id,
        questionCode: q.question_code,
        questionTextEn: q.question_text_en,
        questionTextSw: q.question_text_sw,
        guidanceEn: q.guidance_en,
        guidanceSw: q.guidance_sw,
        requiredAttachment: q.required_attachment,
        aiPrompt: q.ai_prompt,
        sortOrder: q.sort_order,
      });
    }

    successResponse(res, {
      businessId,
      legalVariant: variant,
      domainWeights: DOMAIN_WEIGHTS,
      domains: grouped,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getCurrentAssessment = async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const requester = req.user;

    const business = await Business.findByPk(businessId);
    if (!business) {
      return res
        .status(404)
        .json({ status: false, message: "Business not found" });
    }

    let assessment;
    if (isEntrepreneur(requester.role)) {
      if (business.userId !== requester.id) {
        return res
          .status(403)
          .json({ status: false, message: "Not your business" });
      }
      assessment = await getOrCreateAssessment(businessId, requester.id);
    } else {
      assessment = await CratAssessment.findOne({
        where: { business_id: businessId },
        order: [["createdAt", "DESC"]],
      });
    }

    if (!assessment) {
      return successResponse(res, null);
    }

    const answers = await CratAnswer.findAll({
      where: { assessment_id: assessment.id },
      include: [
        { model: CratQuestionCatalog, attributes: ["question_code", "domain"] },
      ],
    });

    successResponse(res, {
      assessment,
      answers: answers.map((answer) => ({
        id: answer.id,
        questionId: answer.question_id,
        questionCode: answer.CratQuestionCatalog?.question_code,
        domain: answer.domain,
        score: answer.score,
        attachment: answer.evidence,
        evidence: answer.evidence,
        entrepreneurComment: answer.entrepreneur_comment,
        reviewerComment: answer.reviewer_comment,
        reviewedAt: answer.reviewed_at,
      })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const saveEntrepreneurAnswers = async (req, res) => {
  try {
    const requester = req.user;
    if (
      !ensureRole(
        res,
        isEntrepreneur(requester.role),
        "Only entrepreneurs can update draft answers",
      )
    ) {
      return;
    }

    const assessmentId = Number(req.params.assessmentId);
    const { answers = [] } = req.body;

    const assessment = await CratAssessment.findByPk(assessmentId);
    if (!assessment) {
      return res
        .status(404)
        .json({ status: false, message: "Assessment not found" });
    }

    if (assessment.entrepreneur_id !== requester.id) {
      return res.status(403).json({ status: false, message: "Forbidden" });
    }

    if (!["draft", "admin_rejected"].includes(assessment.status)) {
      return res
        .status(400)
        .json({ status: false, message: "Assessment is not editable" });
    }

    for (const item of answers) {
      if (!item.questionId) continue;

      const question = await CratQuestionCatalog.findByPk(item.questionId);
      if (!question) continue;

      await CratAnswer.upsert({
        assessment_id: assessment.id,
        business_id: assessment.business_id,
        question_id: question.id,
        domain: question.domain,
        score: 0,
        evidence: item.evidence || null,
        entrepreneur_comment: item.entrepreneurComment || null,
      });
    }

    successResponse(res, { message: "Draft answers saved" });
  } catch (error) {
    errorResponse(res, error);
  }
};

const submitAssessment = async (req, res) => {
  try {
    const requester = req.user;
    if (
      !ensureRole(
        res,
        isEntrepreneur(requester.role),
        "Only entrepreneurs can submit",
      )
    ) {
      return;
    }

    const assessmentId = Number(req.params.assessmentId);
    const assessment = await CratAssessment.findByPk(assessmentId);

    if (!assessment || assessment.entrepreneur_id !== requester.id) {
      return res
        .status(404)
        .json({ status: false, message: "Assessment not found" });
    }

    await assessment.update({
      status: "submitted",
      submitted_at: new Date(),
    });

    successResponse(res, {
      message: "Assessment submitted for admin assignment",
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const uploadEntrepreneurAttachment = async (req, res) => {
  try {
    const requester = req.user;
    if (
      !ensureRole(
        res,
        isEntrepreneur(requester.role),
        "Only entrepreneurs can upload attachments",
      )
    ) {
      return;
    }

    const assessmentId = Number(req.params.assessmentId);
    const questionId = Number(req.params.questionId);

    if (!req.file) {
      return res
        .status(400)
        .json({ status: false, message: "File is required" });
    }

    const assessment = await CratAssessment.findByPk(assessmentId);
    if (!assessment || assessment.entrepreneur_id !== requester.id) {
      return res
        .status(404)
        .json({ status: false, message: "Assessment not found" });
    }

    if (!["draft", "admin_rejected"].includes(assessment.status)) {
      return res
        .status(400)
        .json({ status: false, message: "Assessment is not editable" });
    }

    const question = await CratQuestionCatalog.findByPk(questionId);
    if (!question) {
      return res
        .status(404)
        .json({ status: false, message: "Question not found" });
    }

    const attachmentUrl = await getUrl(req);

    const existingAnswer = await CratAnswer.findOne({
      where: {
        assessment_id: assessment.id,
        question_id: question.id,
      },
    });

    if (existingAnswer) {
      await existingAnswer.update({ evidence: attachmentUrl });
    } else {
      await CratAnswer.create({
        assessment_id: assessment.id,
        business_id: assessment.business_id,
        question_id: question.id,
        domain: question.domain,
        score: 0,
        evidence: attachmentUrl,
      });
    }

    successResponse(res, {
      message: "Attachment uploaded",
      questionId,
      attachment: attachmentUrl,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getAdminQueue = async (req, res) => {
  try {
    const requester = req.user;
    if (
      !ensureRole(res, isAdmin(requester.role), "Only admin can view queue")
    ) {
      return;
    }

    const statusQuery = req.query.status;
    const statuses = statusQuery
      ? String(statusQuery)
          .split("|")
          .map((s) => s.trim())
      : ["submitted", "assigned", "review_submitted"];

    const assessments = await CratAssessment.findAll({
      where: { status: { [Op.in]: statuses } },
      include: [
        {
          model: User,
          as: "entrepreneur",
          attributes: ["id", "uuid", "name", "email"],
        },
        {
          model: User,
          as: "assignedReviewer",
          attributes: ["id", "name", "email"],
        },
        {
          model: CratAssessmentReviewer,
          as: "assignedReviewers",
          include: [
            {
              model: User,
              as: "reviewer",
              attributes: ["id", "name", "email"],
            },
          ],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    successResponse(res, assessments);
  } catch (error) {
    errorResponse(res, error);
  }
};

const assignReviewer = async (req, res) => {
  try {
    const requester = req.user;
    if (
      !ensureRole(
        res,
        isAdmin(requester.role),
        "Only admin can assign reviewer",
      )
    ) {
      return;
    }

    const assessmentId = Number(req.params.assessmentId);
    // Accept either a single reviewerId (legacy) or an array of reviewerIds
    let reviewerIds = req.body.reviewerIds || [];
    if (!Array.isArray(reviewerIds) && req.body.reviewerId) {
      reviewerIds = [req.body.reviewerId];
    }
    reviewerIds = [...new Set(reviewerIds.map(Number).filter(Boolean))];

    if (reviewerIds.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "At least one reviewer required" });
    }

    const reviewers = await User.findAll({
      where: { id: { [Op.in]: reviewerIds } },
    });

    if (reviewers.length !== reviewerIds.length) {
      return res
        .status(400)
        .json({ status: false, message: "One or more reviewers not found" });
    }

    const invalidReviewers = reviewers.filter((r) => !isReviewer(r.role));
    if (invalidReviewers.length > 0) {
      return res
        .status(400)
        .json({ status: false, message: "All assignees must have Staff role" });
    }

    const assessment = await CratAssessment.findByPk(assessmentId);
    if (!assessment) {
      return res
        .status(404)
        .json({ status: false, message: "Assessment not found" });
    }

    await sequelize.transaction(async (transaction) => {
      // Remove previous reviewer assignments for this assessment
      await CratAssessmentReviewer.destroy({
        where: { assessment_id: assessmentId },
        transaction,
      });

      // Create new reviewer assignments
      await CratAssessmentReviewer.bulkCreate(
        reviewerIds.map((rid) => ({
          assessment_id: assessmentId,
          reviewer_id: rid,
          assigned_by: requester.id,
        })),
        { transaction },
      );

      // Keep assigned_reviewer_id as first reviewer for backward compat
      await assessment.update(
        {
          assigned_reviewer_id: reviewerIds[0],
          status: "assigned",
        },
        { transaction },
      );
    });

    successResponse(res, {
      message: `${reviewerIds.length} reviewer(s) assigned`,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const saveReviewerScores = async (req, res) => {
  try {
    const requester = req.user;
    if (
      !ensureRole(res, isReviewer(requester.role), "Only reviewer can score")
    ) {
      return;
    }

    const assessmentId = Number(req.params.assessmentId);
    const { scores = [] } = req.body;

    const assessment = await CratAssessment.findByPk(assessmentId);
    if (!assessment) {
      return res
        .status(404)
        .json({ status: false, message: "Assessment not found" });
    }

    if (assessment.assigned_reviewer_id !== requester.id) {
      // Also check the join table (for multi-reviewer support)
      const joinRecord = await CratAssessmentReviewer.findOne({
        where: {
          assessment_id: assessmentId,
          reviewer_id: requester.id,
        },
      });
      if (!joinRecord) {
        return res
          .status(403)
          .json({ status: false, message: "Not assigned to you" });
      }
    }

    if (
      !["assigned", "in_review", "admin_rejected"].includes(assessment.status)
    ) {
      return res
        .status(400)
        .json({ status: false, message: "Assessment is not scoreable" });
    }

    for (const item of scores) {
      const score = Number(item.score);
      if (!Number.isInteger(score) || score < 0 || score > 5) {
        return res.status(400).json({
          status: false,
          message: "Score must be an integer from 0 to 5",
        });
      }

      const existingAnswer = await CratAnswer.findOne({
        where: {
          assessment_id: assessment.id,
          question_id: item.questionId,
        },
      });

      if (!existingAnswer) continue;

      await existingAnswer.update({
        score,
        reviewer_comment:
          item.reviewerComment || existingAnswer.reviewer_comment,
        reviewed_by: requester.id,
        reviewed_at: new Date(),
      });
    }

    if (assessment.status === "assigned") {
      await assessment.update({ status: "in_review" });
    }

    successResponse(res, { message: "Reviewer scores saved" });
  } catch (error) {
    errorResponse(res, error);
  }
};

const submitReviewerAssessment = async (req, res) => {
  try {
    const requester = req.user;
    if (
      !ensureRole(
        res,
        isReviewer(requester.role),
        "Only reviewer can submit review",
      )
    ) {
      return;
    }

    const assessmentId = Number(req.params.assessmentId);
    const assessment = await CratAssessment.findByPk(assessmentId);

    if (!assessment || assessment.assigned_reviewer_id !== requester.id) {
      // Also check the join table
      const joinRecord = assessment
        ? await CratAssessmentReviewer.findOne({
            where: { assessment_id: assessmentId, reviewer_id: requester.id },
          })
        : null;
      if (!assessment || !joinRecord) {
        return res
          .status(404)
          .json({ status: false, message: "Assessment not found" });
      }
    }

    await assessment.update({
      status: "review_submitted",
      reviewer_submitted_at: new Date(),
    });

    successResponse(res, { message: "Review submitted to admin" });
  } catch (error) {
    errorResponse(res, error);
  }
};

const approveAssessment = async (req, res) => {
  try {
    const requester = req.user;
    if (!ensureRole(res, isAdmin(requester.role), "Only admin can approve")) {
      return;
    }

    const assessmentId = Number(req.params.assessmentId);
    const { adminDecisionNotes } = req.body;
    const assessment = await CratAssessment.findByPk(assessmentId);

    if (!assessment) {
      return res
        .status(404)
        .json({ status: false, message: "Assessment not found" });
    }

    if (assessment.status !== "review_submitted") {
      return res.status(400).json({
        status: false,
        message: "Assessment must be review_submitted before approval",
      });
    }

    const report = await computeAssessmentScores(assessment.id);

    await sequelize.transaction(async (transaction) => {
      await assessment.update(
        {
          status: "published",
          admin_decided_at: new Date(),
          admin_decision_notes: adminDecisionNotes || null,
          published_at: new Date(),
        },
        { transaction },
      );

      await CratScoreSnapshot.create(
        {
          assessment_id: assessment.id,
          domain_scores_json: JSON.stringify(report.domainScores),
          overall_score_5: report.overallScore5,
          overall_percent: report.overallPercent,
          incomplete: report.incomplete,
          generated_by: requester.id,
          generated_at: new Date(),
        },
        { transaction },
      );
    });

    successResponse(res, { message: "Assessment approved and published" });
  } catch (error) {
    errorResponse(res, error);
  }
};

const rejectAssessment = async (req, res) => {
  try {
    const requester = req.user;
    if (!ensureRole(res, isAdmin(requester.role), "Only admin can reject")) {
      return;
    }

    const assessmentId = Number(req.params.assessmentId);
    const { adminDecisionNotes } = req.body;

    const assessment = await CratAssessment.findByPk(assessmentId);
    if (!assessment) {
      return res
        .status(404)
        .json({ status: false, message: "Assessment not found" });
    }

    await assessment.update({
      status: "assigned",
      admin_decided_at: new Date(),
      admin_decision_notes: adminDecisionNotes || null,
    });

    successResponse(res, { message: "Assessment returned to reviewer" });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getReviewerAssignments = async (req, res) => {
  try {
    const requester = req.user;
    if (
      !ensureRole(
        res,
        isReviewer(requester.role),
        "Only reviewers can access assignments",
      )
    ) {
      return;
    }

    const assessments = await CratAssessment.findAll({
      where: {
        status: {
          [Op.in]: [
            "assigned",
            "in_review",
            "admin_rejected",
            "review_submitted",
            "published",
          ],
        },
      },
      include: [
        {
          model: User,
          as: "entrepreneur",
          attributes: ["id", "name", "email"],
        },
        {
          model: CratAssessmentReviewer,
          as: "assignedReviewers",
          where: { reviewer_id: requester.id },
          required: true,
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    successResponse(res, assessments);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getInternalReport = async (req, res) => {
  try {
    const requester = req.user;
    if (
      !ensureRole(
        res,
        isAdmin(requester.role) || isReviewer(requester.role),
        "Only admin/reviewer can access internal report",
      )
    ) {
      return;
    }

    const businessId = Number(req.params.businessId);
    const assessment = await CratAssessment.findOne({
      where: { business_id: businessId },
      order: [["createdAt", "DESC"]],
    });

    if (!assessment) {
      return successResponse(res, null);
    }

    const payload = await buildReportPayload(businessId, assessment.id);
    successResponse(res, { assessment, ...payload });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getPublishedReport = async (req, res) => {
  try {
    const requester = req.user;
    const businessId = Number(req.params.businessId);

    const business = await Business.findByPk(businessId);
    if (!business) {
      return res
        .status(404)
        .json({ status: false, message: "Business not found" });
    }

    if (isEntrepreneur(requester.role) && business.userId !== requester.id) {
      return res.status(403).json({ status: false, message: "Forbidden" });
    }

    const assessment = await CratAssessment.findOne({
      where: { business_id: businessId, status: "published" },
      order: [["published_at", "DESC"]],
    });

    if (!assessment) {
      return successResponse(res, null);
    }

    const payload = await buildReportPayload(businessId, assessment.id);
    successResponse(res, { assessment, ...payload });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ─── Admin Catalog Management ─────────────────────────────────────────────────

const getAdminCatalog = async (req, res) => {
  try {
    const requester = req.user;
    if (
      !ensureRole(res, isAdmin(requester.role), "Only admin can manage catalog")
    ) {
      return;
    }

    const { domain, variant, active } = req.query;
    const where = {};
    if (domain) where.domain = domain;
    if (variant) where.variant = variant;
    if (active !== undefined) where.is_active = active === "true";

    const questions = await CratQuestionCatalog.findAll({
      where,
      order: [
        ["domain", "ASC"],
        ["sort_order", "ASC"],
      ],
    });

    successResponse(res, questions);
  } catch (error) {
    errorResponse(res, error);
  }
};

const createQuestion = async (req, res) => {
  try {
    const requester = req.user;
    if (
      !ensureRole(
        res,
        isAdmin(requester.role),
        "Only admin can create questions",
      )
    ) {
      return;
    }

    const {
      domain,
      variant = "default",
      question_code,
      question_text_en,
      question_text_sw,
      guidance_en,
      guidance_sw,
      required_attachment,
      ai_prompt,
      sort_order = 0,
    } = req.body;

    if (!domain || !question_code || !question_text_en) {
      return res
        .status(400)
        .json({
          status: false,
          message: "domain, question_code, and question_text_en are required",
        });
    }

    if (!VALID_DOMAINS.includes(domain)) {
      return res
        .status(400)
        .json({
          status: false,
          message: `domain must be one of: ${VALID_DOMAINS.join(", ")}`,
        });
    }

    const question = await CratQuestionCatalog.create({
      domain,
      variant,
      question_code,
      question_text_en,
      question_text_sw: question_text_sw || null,
      guidance_en: guidance_en || null,
      guidance_sw: guidance_sw || null,
      required_attachment: required_attachment || null,
      ai_prompt: ai_prompt || null,
      sort_order,
      is_active: true,
    });

    successResponse(res, question);
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(400)
        .json({ status: false, message: "question_code must be unique" });
    }
    errorResponse(res, error);
  }
};

const updateQuestion = async (req, res) => {
  try {
    const requester = req.user;
    if (
      !ensureRole(
        res,
        isAdmin(requester.role),
        "Only admin can update questions",
      )
    ) {
      return;
    }

    const questionId = Number(req.params.questionId);
    const question = await CratQuestionCatalog.findByPk(questionId);
    if (!question) {
      return res
        .status(404)
        .json({ status: false, message: "Question not found" });
    }

    const allowedFields = [
      "question_text_en",
      "question_text_sw",
      "guidance_en",
      "guidance_sw",
      "required_attachment",
      "ai_prompt",
      "sort_order",
      "is_active",
      "variant",
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    await question.update(updates);
    successResponse(res, question);
  } catch (error) {
    errorResponse(res, error);
  }
};

const toggleQuestionActive = async (req, res) => {
  try {
    const requester = req.user;
    if (
      !ensureRole(
        res,
        isAdmin(requester.role),
        "Only admin can toggle questions",
      )
    ) {
      return;
    }

    const questionId = Number(req.params.questionId);
    const question = await CratQuestionCatalog.findByPk(questionId);
    if (!question) {
      return res
        .status(404)
        .json({ status: false, message: "Question not found" });
    }

    await question.update({ is_active: !question.is_active });
    successResponse(res, { is_active: question.is_active });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ─── Backend AI Review ────────────────────────────────────────────────────────

const executeAiReview = async (req, res) => {
  try {
    const requester = req.user;
    if (
      !ensureRole(res, isAdmin(requester.role), "Only admin can run AI review")
    ) {
      return;
    }

    const assessmentId = Number(req.params.assessmentId);

    const assessment = await CratAssessment.findByPk(assessmentId, {
      include: [
        {
          model: User,
          as: "entrepreneur",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!assessment) {
      return res
        .status(404)
        .json({ status: false, message: "Assessment not found" });
    }

    // Load all answers with their questions (including per-question ai_prompt)
    const answers = await CratAnswer.findAll({
      where: { assessment_id: assessmentId },
      include: [
        {
          model: CratQuestionCatalog,
          attributes: [
            "id",
            "domain",
            "question_code",
            "question_text_en",
            "ai_prompt",
            "sort_order",
          ],
        },
      ],
      order: [
        [CratQuestionCatalog, "domain", "ASC"],
        [CratQuestionCatalog, "sort_order", "ASC"],
      ],
    });

    // Build domain-grouped view of Q&A with per-question ai_prompts
    const domainSections = {};
    for (const answer of answers) {
      const q = answer.CratQuestionCatalog;
      if (!q) continue;
      const domain = q.domain;
      if (!domainSections[domain]) domainSections[domain] = [];
      domainSections[domain].push({
        code: q.question_code,
        question: q.question_text_en,
        score: answer.score,
        evidence: answer.evidence || "No evidence provided",
        entrepreneurComment: answer.entrepreneur_comment || "",
        reviewerComment: answer.reviewer_comment || "",
        aiPrompt: q.ai_prompt || "",
      });
    }

    const scores = await computeAssessmentScores(assessmentId);

    // Build the composite AI prompt
    let promptParts = [
      `You are a Capital Readiness Assessment (CRAT) expert evaluating a business's readiness across four domains.`,
      ``,
      `OVERALL SCORES:`,
      `- Overall Score: ${scores.overallScore5.toFixed(2)} / 5 (${scores.overallPercent.toFixed(1)}%)`,
      ...VALID_DOMAINS.map(
        (d) =>
          `- ${d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}: avg ${(scores.domainScores[d]?.average || 0).toFixed(2)} / 5`,
      ),
      ``,
    ];

    for (const domain of VALID_DOMAINS) {
      const items = domainSections[domain] || [];
      if (items.length === 0) continue;
      promptParts.push(`\n## ${domain.replace(/_/g, " ").toUpperCase()}\n`);
      for (const item of items) {
        promptParts.push(`**${item.code}**: ${item.question}`);
        promptParts.push(`Score: ${item.score}/5`);
        if (item.evidence !== "No evidence provided") {
          promptParts.push(`Evidence: ${item.evidence}`);
        }
        if (item.entrepreneurComment) {
          promptParts.push(`Entrepreneur Comment: ${item.entrepreneurComment}`);
        }
        if (item.reviewerComment) {
          promptParts.push(`Reviewer Comment: ${item.reviewerComment}`);
        }
        if (item.aiPrompt) {
          promptParts.push(`Evaluation Guidance: ${item.aiPrompt}`);
        }
        promptParts.push("");
      }
    }

    promptParts.push(
      `\nBased on all the above, provide a comprehensive CRAT analysis including:`,
      `1. Executive Summary (key strengths and weaknesses)`,
      `2. Domain-by-domain findings and recommendations`,
      `3. Top 3 priority actions to improve capital readiness`,
      `4. Overall readiness verdict (Not Ready / Developing / Ready / Investment Ready)`,
    );

    const fullPrompt = promptParts.join("\n");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res
        .status(503)
        .json({
          status: false,
          message: "OpenAI API key not configured on server",
        });
    }

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert capital readiness analyst helping investors and entrepreneurs understand business readiness. Provide structured, actionable analysis in markdown format.",
        },
        { role: "user", content: fullPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.4,
    });

    const analysis = completion.choices?.[0]?.message?.content || "";

    successResponse(res, {
      assessmentId,
      analysis,
      scores: {
        overallScore5: scores.overallScore5,
        overallPercent: scores.overallPercent,
        domainScores: scores.domainScores,
      },
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  getCatalog,
  getCurrentAssessment,
  saveEntrepreneurAnswers,
  uploadEntrepreneurAttachment,
  submitAssessment,
  getAdminQueue,
  assignReviewer,
  saveReviewerScores,
  submitReviewerAssessment,
  approveAssessment,
  rejectAssessment,
  getReviewerAssignments,
  getInternalReport,
  getPublishedReport,
  // Admin catalog management
  getAdminCatalog,
  createQuestion,
  updateQuestion,
  toggleQuestionActive,
  // Backend AI review
  executeAiReview,
};
