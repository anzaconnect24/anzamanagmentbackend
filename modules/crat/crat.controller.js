const { Op } = require("sequelize");
const {
  scoreAssessment,
  scoreAssessmentInBackground,
} = require("./crat.ai");
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
  CratReviewerScore,
  CohortProgram,
  CohortMembership,
  User,
  sequelize,
} = require("../../models");

const DEFAULT_DOMAIN_WEIGHTS = {
  commercial_marketing: 0.25,
  financial: 0.35,
  legal_compliance: 0.25,
  operations: 0.15,
};

const DEFAULT_DOMAIN_ORDER = Object.keys(DEFAULT_DOMAIN_WEIGHTS);

const isAdmin = (role) => role === "Admin";
const isReviewer = (role) => role === "Staff";
const isEntrepreneur = (role) => role === "Enterprenuer";

const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const parseEvidenceList = (evidence) => {
  if (!evidence) return [];

  const raw = String(evidence).trim();
  if (!raw) return [];

  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim()).filter(Boolean);
      }
    } catch (_) {
      return [raw];
    }
  }

  return [raw];
};

const normalizeEvidenceInput = (input) => {
  if (Array.isArray(input)) {
    return input.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (!input) return [];

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => String(item || "").trim())
            .filter(Boolean);
        }
      } catch (_) {
        return [trimmed];
      }
    }

    return [trimmed];
  }

  return [];
};

const serializeEvidenceList = (list) => {
  const clean = [
    ...new Set(
      (list || []).map((item) => String(item || "").trim()).filter(Boolean),
    ),
  ];
  if (clean.length === 0) return null;
  if (clean.length === 1) return clean[0];
  return JSON.stringify(clean);
};

const parseRequiredAttachmentList = (value) => {
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value.map((item) => String(item || "").trim()).filter(Boolean),
      ),
    ];
  }

  if (value === null || value === undefined) return [];

  const raw = String(value).trim();
  if (!raw) return [];

  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return [
          ...new Set(
            parsed.map((item) => String(item || "").trim()).filter(Boolean),
          ),
        ];
      }
    } catch (_) {
      return [raw];
    }
  }

  const splitItems = raw
    .split(/[\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (splitItems.length > 1) {
    return [...new Set(splitItems)];
  }

  return [raw];
};

const serializeRequiredAttachmentList = (value) => {
  const clean = parseRequiredAttachmentList(value);
  if (clean.length === 0) return null;
  if (clean.length === 1) return clean[0];
  return JSON.stringify(clean);
};

const getDomainOrder = (domains = []) => {
  const normalized = [...new Set(domains.map(normalizeKey).filter(Boolean))];
  const defaults = DEFAULT_DOMAIN_ORDER.filter((domain) =>
    normalized.includes(domain),
  );
  const extras = normalized.filter((domain) => !defaults.includes(domain));
  return [...defaults, ...extras];
};

const buildDomainWeights = (domains = []) => {
  const orderedDomains = getDomainOrder(domains);
  if (orderedDomains.length === 0) return {};

  const raw = orderedDomains.reduce((acc, domain) => {
    acc[domain] = DEFAULT_DOMAIN_WEIGHTS[domain] || 0.2;
    return acc;
  }, {});

  const total = Object.values(raw).reduce((sum, weight) => sum + weight, 0);
  if (!total) {
    const equalWeight = 1 / orderedDomains.length;
    return orderedDomains.reduce((acc, domain) => {
      acc[domain] = equalWeight;
      return acc;
    }, {});
  }

  return orderedDomains.reduce((acc, domain) => {
    acc[domain] = raw[domain] / total;
    return acc;
  }, {});
};

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
  // Only the questions this assessment's startup was actually asked count
  // towards its totals. Counting another programme's questions would make a
  // completed assessment look unfinished and drag its domain averages down.
  const assessment = await CratAssessment.findByPk(assessmentId, {
    attributes: ["business_id"],
  });

  const cohortProgramIds = assessment
    ? await programmesOfBusiness(assessment.business_id)
    : [];

  const questions = await CratQuestionCatalog.findAll({
    where: {
      is_active: true,
      ...questionScopeFor(cohortProgramIds),
    },
    attributes: ["id", "domain"],
  });

  const domains = getDomainOrder(questions.map((q) => q.domain));
  const domainWeights = buildDomainWeights(domains);

  const questionMap = new Map();
  for (const q of questions) {
    questionMap.set(q.id, normalizeKey(q.domain));
  }

  const answers = await CratAnswer.findAll({
    where: { assessment_id: assessmentId },
    attributes: ["question_id", "score"],
  });

  const domainBuckets = domains.reduce((acc, domain) => {
    acc[domain] = [];
    return acc;
  }, {});

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
    if (!domain || !domainBuckets[domain]) continue;

    const score = Number(answer.score ?? 0);
    if (scoreDistribution[score] !== undefined) {
      scoreDistribution[score] += 1;
    }

    if (score >= 0 && score <= 5) {
      domainBuckets[domain].push(score);
    }
  }

  const domainScores = {};
  let weightedRaw = 0;
  let reviewedWeight = 0;

  for (const domain of domains) {
    const reviewedScores = domainBuckets[domain];
    const reviewedQuestions = reviewedScores.length;
    const totalQuestions = questions.filter(
      (q) => normalizeKey(q.domain) === domain,
    ).length;

    const average =
      reviewedQuestions > 0
        ? reviewedScores.reduce((acc, val) => acc + val, 0) / reviewedQuestions
        : 0;

    const weight = domainWeights[domain] || 0;
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
    totalDomains: domains.length,
    scoreDistribution,
    domainWeights,
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

  const weightedContribution = Object.keys(summary.domainScores).map(
    (domain) => ({
      domain,
      value: summary.domainScores[domain].weightedContribution,
      average: summary.domainScores[domain].average,
      weight: summary.domainScores[domain].weight,
    }),
  );

  return {
    ...summary,
    weightedContribution,
    trend,
  };
};

// Every programme a startup is enrolled in. Empty when it is on none.
const programmesOfBusiness = async (businessId) => {
  const memberships = await CohortMembership.findAll({
    where: { businessId },
    attributes: ["cohortProgramId"],
    raw: true,
  });

  return memberships.map((row) => row.cohortProgramId);
};

// A startup is asked the questions written for any programme it is on, plus
// the shared ones that carry no programme. Anything written only for a
// programme it is not on is not theirs to answer.
const questionScopeFor = (cohortProgramIds = []) => ({
  [Op.or]: [
    { cohort_program_id: null },
    ...(cohortProgramIds.length
      ? [{ cohort_program_id: { [Op.in]: cohortProgramIds } }]
      : []),
  ],
});

const getCatalog = async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const variant = await resolveLegalVariant(businessId);
    const cohortProgramIds = await programmesOfBusiness(businessId);

    const questions = await CratQuestionCatalog.findAll({
      where: {
        is_active: true,
        [Op.and]: [
          questionScopeFor(cohortProgramIds),
          {
            [Op.or]: [
              { domain: { [Op.ne]: "legal_compliance" } },
              { domain: "legal_compliance", variant },
            ],
          },
        ],
      },
      order: [
        ["domain", "ASC"],
        ["sort_order", "ASC"],
      ],
    });

    const orderedDomains = getDomainOrder(questions.map((q) => q.domain));
    const grouped = orderedDomains.reduce((acc, domain) => {
      acc[domain] = [];
      return acc;
    }, {});

    for (const q of questions) {
      const domain = normalizeKey(q.domain);
      if (!grouped[domain]) {
        grouped[domain] = [];
      }

      grouped[domain].push({
        id: q.id,
        questionCode: q.question_code,
        questionTextEn: q.question_text_en,
        questionTextSw: q.question_text_sw,
        guidanceEn: q.guidance_en,
        guidanceSw: q.guidance_sw,
        requiredAttachment: q.required_attachment,
        requiredAttachmentSw: q.required_attachment_sw,
        requiredAttachments: parseRequiredAttachmentList(q.required_attachment),
        requiredAttachmentsSw: parseRequiredAttachmentList(
          q.required_attachment_sw,
        ),
        aiPrompt: q.ai_prompt,
        sortOrder: q.sort_order,
      });
    }

    successResponse(res, {
      businessId,
      legalVariant: variant,
      domainWeights: buildDomainWeights(Object.keys(grouped)),
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

    let reviewerScoreMap = new Map();
    if (isReviewer(requester.role)) {
      const reviewerScores = await CratReviewerScore.findAll({
        where: {
          assessment_id: assessment.id,
          reviewer_id: requester.id,
        },
      });

      reviewerScoreMap = new Map(
        reviewerScores.map((score) => [
          score.question_id,
          {
            score: Number(score.score ?? 0),
            reviewerComment: score.reviewer_comment || "",
          },
        ]),
      );
    }

    successResponse(res, {
      assessment,
      answers: answers.map((answer) => ({
        attachments: parseEvidenceList(answer.evidence),
        ...(reviewerScoreMap.get(answer.question_id) || {}),
        id: answer.id,
        questionId: answer.question_id,
        questionCode: answer.CratQuestionCatalog?.question_code,
        domain: answer.domain,
        score:
          reviewerScoreMap.get(answer.question_id)?.score ??
          Number(answer.score ?? 0),
        attachment: parseEvidenceList(answer.evidence)[0] || null,
        evidence: answer.evidence,
        entrepreneurComment: answer.entrepreneur_comment,
        reviewerComment:
          reviewerScoreMap.get(answer.question_id)?.reviewerComment ||
          answer.reviewer_comment,
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
        evidence: serializeEvidenceList(
          normalizeEvidenceInput(item.attachments || item.evidence),
        ),
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
      status: "ai_scoring",
      submitted_at: new Date(),
      ai_error: null,
    });

    // Scoring runs in the background: it calls out to the model and can take
    // a while, and the applicant should not be left waiting on it. The
    // assessment sits in "ai_scoring" until it finishes, then becomes
    // "ai_scored" for an Admin to publish, or "ai_failed" with the reason.
    scoreAssessmentInBackground(assessment.id);

    successResponse(res, {
      message:
        "Assessment submitted. It is being scored and will then go to an admin for publishing.",
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

    const uploadedFiles = [
      ...(Array.isArray(req.files) ? req.files : []),
      ...(req.file ? [req.file] : []),
    ];

    if (uploadedFiles.length === 0) {
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

    const attachmentUrls = [];
    for (const file of uploadedFiles) {
      const attachmentUrl = await getUrl({ ...req, file });
      if (attachmentUrl) {
        attachmentUrls.push(attachmentUrl);
      }
    }

    if (attachmentUrls.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "Failed to process uploaded file(s)" });
    }

    const existingAnswer = await CratAnswer.findOne({
      where: {
        assessment_id: assessment.id,
        question_id: question.id,
      },
    });

    if (existingAnswer) {
      const mergedAttachments = [
        ...parseEvidenceList(existingAnswer.evidence),
        ...attachmentUrls,
      ];

      await existingAnswer.update({
        evidence: serializeEvidenceList(mergedAttachments),
      });
    } else {
      await CratAnswer.create({
        assessment_id: assessment.id,
        business_id: assessment.business_id,
        question_id: question.id,
        domain: question.domain,
        score: 0,
        evidence: serializeEvidenceList(attachmentUrls),
      });
    }

    const latestAnswer = await CratAnswer.findOne({
      where: {
        assessment_id: assessment.id,
        question_id: question.id,
      },
    });

    const attachments = parseEvidenceList(latestAnswer?.evidence);

    successResponse(res, {
      message: "Attachment uploaded",
      questionId,
      attachment: attachments[attachments.length - 1] || null,
      attachments,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteEntrepreneurAttachment = async (req, res) => {
  try {
    const requester = req.user;
    if (
      !ensureRole(
        res,
        isEntrepreneur(requester.role),
        "Only entrepreneurs can delete attachments",
      )
    ) {
      return;
    }

    const assessmentId = Number(req.params.assessmentId);
    const questionId = Number(req.params.questionId);
    const attachmentUrl = String(
      req.query.attachmentUrl || req.body?.attachmentUrl || "",
    ).trim();

    if (!attachmentUrl) {
      return res
        .status(400)
        .json({ status: false, message: "attachmentUrl is required" });
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

    const answer = await CratAnswer.findOne({
      where: {
        assessment_id: assessment.id,
        question_id: question.id,
      },
    });

    if (!answer) {
      return res
        .status(404)
        .json({ status: false, message: "Attachment not found" });
    }

    const currentAttachments = parseEvidenceList(answer.evidence);
    const remainingAttachments = currentAttachments.filter(
      (item) => item !== attachmentUrl,
    );

    if (remainingAttachments.length === currentAttachments.length) {
      return res
        .status(404)
        .json({ status: false, message: "Attachment not found" });
    }

    await answer.update({
      evidence: serializeEvidenceList(remainingAttachments),
    });

    successResponse(res, {
      message: "Attachment deleted",
      questionId,
      attachmentUrl,
      attachments: remainingAttachments,
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
      : ["submitted", "ai_scoring", "ai_scored", "ai_failed"];

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

    if (assessment.status !== "ai_scored") {
      return res.status(400).json({
        status: false,
        message:
          assessment.status === "ai_scoring"
            ? "This assessment is still being scored"
            : assessment.status === "ai_failed"
              ? "Scoring failed for this assessment. Re-run it before publishing."
              : "This assessment has not been scored yet",
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

    // There is no reviewer to send it back to: rejecting marks the scoring
    // as not accepted, and an admin re-scores it or the applicant revises and
    // resubmits.
    await assessment.update({
      status: "ai_failed",
      admin_decided_at: new Date(),
      admin_decision_notes: adminDecisionNotes || null,
      ai_error: adminDecisionNotes
        ? `Rejected by admin: ${adminDecisionNotes}`
        : "Rejected by admin",
    });

    successResponse(res, {
      message: "Scoring rejected. Re-score the assessment or ask for a revision.",
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteAssessment = async (req, res) => {
  try {
    const requester = req.user;
    if (!ensureRole(res, isAdmin(requester.role), "Only admin can delete")) {
      return;
    }

    const assessmentId = Number(req.params.assessmentId);
    const assessment = await CratAssessment.findByPk(assessmentId);

    if (!assessment) {
      return res
        .status(404)
        .json({ status: false, message: "Assessment not found" });
    }

    await sequelize.transaction(async (transaction) => {
      await CratReviewerScore.destroy({
        where: { assessment_id: assessmentId },
        transaction,
      });

      await CratAssessmentReviewer.destroy({
        where: { assessment_id: assessmentId },
        transaction,
      });

      await CratAnswer.destroy({
        where: { assessment_id: assessmentId },
        transaction,
      });

      await CratScoreSnapshot.destroy({
        where: { assessment_id: assessmentId },
        transaction,
      });

      await assessment.destroy({ transaction });
    });

    successResponse(res, { message: "Assessment deleted" });
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

    const { domain, variant, active, program } = req.query;
    const where = {};
    if (domain) where.domain = normalizeKey(domain);
    if (variant) where.variant = normalizeKey(variant);
    if (active !== undefined) where.is_active = active === "true";

    // "shared" narrows to the questions every programme gets; a uuid narrows
    // to one programme's own.
    if (program === "shared") {
      where.cohort_program_id = null;
    } else if (program) {
      const programme = await CohortProgram.findOne({
        where: { uuid: program },
        attributes: ["id"],
      });

      if (!programme) {
        return successResponse(res, []);
      }

      where.cohort_program_id = programme.id;
    }

    const questions = await CratQuestionCatalog.findAll({
      where,
      include: [
        {
          model: CohortProgram,
          required: false,
          attributes: ["uuid", "title"],
        },
      ],
      order: [
        ["domain", "ASC"],
        ["sort_order", "ASC"],
      ],
    });

    successResponse(
      res,
      questions.map((question) => ({
        ...question.toJSON(),
        required_attachments: parseRequiredAttachmentList(
          question.required_attachment,
        ),
        required_attachments_sw: parseRequiredAttachmentList(
          question.required_attachment_sw,
        ),
      })),
    );
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
      required_attachment_sw,
      required_attachments,
      required_attachments_sw,
      ai_prompt,
      sort_order = 0,
      // The programme this question is for. Omit it, or send null, and the
      // question is asked of every startup.
      cohort_program_uuid,
    } = req.body;

    const domainValue = normalizeKey(domain);
    const variantValue = normalizeKey(variant || "default");

    if (!domainValue || !question_code || !question_text_en) {
      return res.status(400).json({
        status: false,
        message: "domain, question_code, and question_text_en are required",
      });
    }

    let cohortProgramId = null;

    if (cohort_program_uuid) {
      const programme = await CohortProgram.findOne({
        where: { uuid: cohort_program_uuid },
        attributes: ["id"],
      });

      if (!programme) {
        return res
          .status(404)
          .json({ status: false, message: "Program not found" });
      }

      cohortProgramId = programme.id;
    }

    const question = await CratQuestionCatalog.create({
      domain: domainValue,
      cohort_program_id: cohortProgramId,
      variant: variantValue,
      question_code,
      question_text_en,
      question_text_sw: question_text_sw || null,
      guidance_en: guidance_en || null,
      guidance_sw: guidance_sw || null,
      required_attachment: serializeRequiredAttachmentList(
        required_attachments !== undefined
          ? required_attachments
          : required_attachment,
      ),
      required_attachment_sw: serializeRequiredAttachmentList(
        required_attachments_sw !== undefined
          ? required_attachments_sw
          : required_attachment_sw,
      ),
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

    // Moving a question to another programme, or back to being shared.
    if (req.body.cohort_program_uuid !== undefined) {
      if (!req.body.cohort_program_uuid) {
        await question.update({ cohort_program_id: null });
      } else {
        const programme = await CohortProgram.findOne({
          where: { uuid: req.body.cohort_program_uuid },
          attributes: ["id"],
        });

        if (!programme) {
          return res
            .status(404)
            .json({ status: false, message: "Program not found" });
        }

        await question.update({ cohort_program_id: programme.id });
      }
    }

    const allowedFields = [
      "domain",
      "question_text_en",
      "question_text_sw",
      "guidance_en",
      "guidance_sw",
      "required_attachment",
      "required_attachment_sw",
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

    if (updates.domain !== undefined) {
      updates.domain = normalizeKey(updates.domain);
    }

    if (updates.variant !== undefined) {
      updates.variant = normalizeKey(updates.variant);
    }

    if (
      req.body.required_attachments !== undefined ||
      req.body.required_attachment !== undefined
    ) {
      updates.required_attachment = serializeRequiredAttachmentList(
        req.body.required_attachments !== undefined
          ? req.body.required_attachments
          : req.body.required_attachment,
      );
    }

    if (
      req.body.required_attachments_sw !== undefined ||
      req.body.required_attachment_sw !== undefined
    ) {
      updates.required_attachment_sw = serializeRequiredAttachmentList(
        req.body.required_attachments_sw !== undefined
          ? req.body.required_attachments_sw
          : req.body.required_attachment_sw,
      );
    }

    ["question_text_sw", "guidance_en", "guidance_sw", "ai_prompt"].forEach(
      (nullableField) => {
        if (updates[nullableField] === "") {
          updates[nullableField] = null;
        }
      },
    );

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

const deleteQuestion = async (req, res) => {
  try {
    const requester = req.user;
    if (
      !ensureRole(
        res,
        isAdmin(requester.role),
        "Only admin can delete questions",
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

    await question.destroy();
    successResponse(res, { message: "Question deleted successfully" });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ─── Backend AI Review ────────────────────────────────────────────────────────

// Re-run scoring on an assessment. Used when scoring failed, or when an
// Admin wants it scored again after the question guidance has changed.
const executeAiReview = async (req, res) => {
  try {
    const requester = req.user;

    if (
      !ensureRole(res, isAdmin(requester.role), "Only admin can run AI scoring")
    ) {
      return;
    }

    const assessmentId = Number(req.params.assessmentId);
    const assessment = await CratAssessment.findByPk(assessmentId);

    if (!assessment) {
      return res
        .status(404)
        .json({ status: false, message: "Assessment not found" });
    }

    if (assessment.status === "draft") {
      return res.status(400).json({
        status: false,
        message: "This assessment has not been submitted yet",
      });
    }

    // Published results are the official record; re-scoring one would change
    // figures that have already been reported.
    if (assessment.status === "published") {
      return res.status(409).json({
        status: false,
        message: "This assessment is already published",
      });
    }

    const result = await scoreAssessment(assessmentId);

    successResponse(res, {
      message: `Scored ${result.scored} answers`,
      ...result,
    });
  } catch (error) {
    // Record why, so the queue can show it rather than failing silently.
    await CratAssessment.update(
      { status: "ai_failed", ai_error: error.message },
      { where: { id: Number(req.params.assessmentId) } },
    ).catch(() => {});

    errorResponse(res, error);
  }
};

const getAvailableDomainsEndpoint = async (req, res) => {
  try {
    // Staff and admins see every domain; a startup sees only the domains its
    // own programme actually asks about.
    let where = { is_active: true };

    if (isEntrepreneur(req.user?.role)) {
      const business = await Business.findOne({
        where: { userId: req.user.id },
        attributes: ["id"],
      });

      const cohortProgramIds = business
        ? await programmesOfBusiness(business.id)
        : [];

      where = {
        is_active: true,
        ...questionScopeFor(cohortProgramIds),
      };
    }

    const questions = await CratQuestionCatalog.findAll({
      where,
      attributes: ["domain"],
      raw: true,
    });

    const uniqueDomains = [
      ...new Set(questions.map((q) => q.domain).filter(Boolean)),
    ].sort();

    successResponse(res, uniqueDomains);
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
  deleteEntrepreneurAttachment,
  getAdminQueue,
  approveAssessment,
  rejectAssessment,
  deleteAssessment,
  getInternalReport,
  getPublishedReport,
  // Admin catalog management
  getAdminCatalog,
  createQuestion,
  updateQuestion,
  toggleQuestionActive,
  deleteQuestion,
  // Backend AI review
  executeAiReview,
  // Public endpoints
  getAvailableDomainsEndpoint,
};
