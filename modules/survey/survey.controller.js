const { errorResponse, successResponse } = require("../../utils/responses");
const {
  Survey,
  SurveyQuestion,
  SurveyResponse,
  SurveyAnswer,
  CohortProgram,
  CohortMembership,
  Business,
  sequelize,
} = require("../../models");
const { Op } = require("sequelize");

const AUTHOR_ROLES = ["Admin", "Staff", "Reviewer", "Finance"];

// Model getters parse the JSON columns, but a raw query returns them as text.
const asList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const isAuthor = (req) => AUTHOR_ROLES.includes(req.user && req.user.role);

// Every programme the signed-in startup is enrolled in, with its business.
// A survey is open to the startup if it belongs to any of them; the routes
// that must resolve to a single programme take cohortProgramIds[0], the most
// recently joined.
const myMembership = async (userId) => {
  const business = await Business.findOne({
    where: { userId },
    attributes: ["id"],
  });

  if (!business) return null;

  const memberships = await CohortMembership.findAll({
    where: { businessId: business.id },
    attributes: ["cohortProgramId"],
    order: [["createdAt", "DESC"], ["id", "DESC"]],
    raw: true,
  });

  if (!memberships.length) return null;

  return {
    businessId: business.id,
    cohortProgramIds: memberships.map((row) => row.cohortProgramId),
  };
};

const questionInclude = {
  model: SurveyQuestion,
  required: false,
  order: [["position", "ASC"]],
};

const shapeQuestion = (question) => ({
  uuid: question.uuid,
  questionText: question.questionText,
  questionType: question.questionType,
  options: asList(question.options),
  required: !!question.required,
  position: question.position,
});

// Surveys of one programme. Staff see every survey; a startup sees only the
// published ones on its own programme, each marked with whether it answered.
const getSurveys = async (req, res) => {
  try {
    const { cohortProgram } = req.query;

    let program = null;
    let membership = null;

    if (isAuthor(req)) {
      if (!cohortProgram) {
        return res.status(400).json({
          status: false,
          message: "A program is required",
        });
      }

      program = await CohortProgram.findOne({ where: { uuid: cohortProgram } });
    } else {
      membership = await myMembership(req.user.id);

      if (!membership) {
        return successResponse(res, { program: null, data: [], count: 0 });
      }

      // This route shows one programme's surveys, so it takes the most recent.
      program = await CohortProgram.findByPk(membership.cohortProgramIds[0]);
    }

    if (!program) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const where = { cohortProgramId: program.id };
    if (!isAuthor(req)) where.status = "published";

    const surveys = await Survey.findAll({
      where,
      include: [questionInclude],
      order: [["createdAt", "DESC"]],
    });

    const surveyIds = surveys.map((row) => row.id);

    // Staff want the response count; a startup wants to know if it answered.
    const responses = surveyIds.length
      ? await SurveyResponse.findAll({
          attributes: ["surveyId", "businessId", "submittedAt"],
          where: {
            surveyId: { [Op.in]: surveyIds },
            ...(membership ? { businessId: membership.businessId } : {}),
          },
          raw: true,
        })
      : [];

    const countBy = new Map();
    const mine = new Set();

    for (const row of responses) {
      if (!row.submittedAt) continue;
      countBy.set(row.surveyId, (countBy.get(row.surveyId) || 0) + 1);
      if (membership && row.businessId === membership.businessId) {
        mine.add(row.surveyId);
      }
    }

    const members = await CohortMembership.count({
      where: { cohortProgramId: program.id },
    });

    successResponse(res, {
      program,
      members,
      data: surveys.map((survey) => ({
        uuid: survey.uuid,
        title: survey.title,
        description: survey.description,
        status: survey.status,
        createdAt: survey.createdAt,
        questions: (survey.SurveyQuestions || []).length,
        responses: countBy.get(survey.id) || 0,
        answered: mine.has(survey.id),
      })),
      count: surveys.length,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// One survey with its questions, in order.
const getSurvey = async (req, res) => {
  try {
    const survey = await Survey.findOne({
      where: { uuid: req.params.uuid },
      include: [questionInclude, { model: CohortProgram }],
    });

    if (!survey) {
      return res
        .status(404)
        .json({ status: false, message: "Survey not found" });
    }

    let answered = false;

    if (!isAuthor(req)) {
      const membership = await myMembership(req.user.id);

      // A startup may only open a published survey on its own programme.
      if (
        !membership ||
        !membership.cohortProgramIds.includes(survey.cohortProgramId) ||
        survey.status !== "published"
      ) {
        return res.status(403).json({
          status: false,
          message: "This survey is not open to you",
        });
      }

      const existing = await SurveyResponse.findOne({
        where: { surveyId: survey.id, businessId: membership.businessId },
      });

      answered = !!(existing && existing.submittedAt);
    }

    const questions = [...(survey.SurveyQuestions || [])].sort(
      (a, b) => a.position - b.position,
    );

    successResponse(res, {
      uuid: survey.uuid,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      createdAt: survey.createdAt,
      program: survey.CohortProgram
        ? {
            uuid: survey.CohortProgram.uuid,
            title: survey.CohortProgram.title,
            category: survey.CohortProgram.category,
          }
        : null,
      questions: questions.map(shapeQuestion),
      answered,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Replace a survey's questions with exactly what was sent, keeping the order
// they arrive in. Simpler than diffing, and a survey is edited as a whole.
const saveQuestions = async (surveyId, questions, transaction) => {
  if (!Array.isArray(questions)) return;

  await SurveyQuestion.destroy({ where: { surveyId }, transaction });

  const rows = questions
    .filter((question) => String(question.questionText || "").trim())
    .map((question, index) => {
      const type = SurveyQuestion.TYPES.includes(question.questionType)
        ? question.questionType
        : "text";

      const choices =
        type === "single_choice" || type === "multiple_choice"
          ? (Array.isArray(question.options) ? question.options : [])
              .map((option) => String(option).trim())
              .filter(Boolean)
          : null;

      return {
        surveyId,
        questionText: String(question.questionText).trim(),
        questionType: type,
        options: choices,
        required: question.required !== false,
        position: index,
      };
    });

  if (rows.length) await SurveyQuestion.bulkCreate(rows, { transaction });
};

const createSurvey = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { cohortProgram, title, description, status, questions } = req.body;

    if (!String(title || "").trim()) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ status: false, message: "A survey title is required" });
    }

    const program = await CohortProgram.findOne({
      where: { uuid: cohortProgram },
    });

    if (!program) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const survey = await Survey.create(
      {
        cohortProgramId: program.id,
        title: String(title).trim(),
        description: description || null,
        status: Survey.STATUSES.includes(status) ? status : "draft",
        createdById: req.user ? req.user.id : null,
      },
      { transaction },
    );

    await saveQuestions(survey.id, questions, transaction);

    await transaction.commit();

    successResponse(res, { uuid: survey.uuid });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

const updateSurvey = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const survey = await Survey.findOne({ where: { uuid: req.params.uuid } });

    if (!survey) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Survey not found" });
    }

    const { title, description, status, questions } = req.body;

    await survey.update(
      {
        title: title !== undefined ? String(title).trim() : survey.title,
        description:
          description !== undefined ? description : survey.description,
        status: Survey.STATUSES.includes(status) ? status : survey.status,
      },
      { transaction },
    );

    // Rewriting the questions would orphan answers already given, so it is
    // only allowed while the survey has no submissions.
    if (questions !== undefined) {
      const submitted = await SurveyResponse.count({
        where: { surveyId: survey.id, submittedAt: { [Op.ne]: null } },
      });

      if (submitted > 0) {
        await transaction.rollback();
        return res.status(409).json({
          status: false,
          message:
            "This survey already has responses, so its questions can no longer be changed",
        });
      }

      await saveQuestions(survey.id, questions, transaction);
    }

    await transaction.commit();

    successResponse(res, { uuid: survey.uuid });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

const deleteSurvey = async (req, res) => {
  try {
    const survey = await Survey.findOne({ where: { uuid: req.params.uuid } });

    if (!survey) {
      return res
        .status(404)
        .json({ status: false, message: "Survey not found" });
    }

    // Questions, responses and answers go with it.
    const responses = await SurveyResponse.findAll({
      attributes: ["id"],
      where: { surveyId: survey.id },
      raw: true,
    });

    if (responses.length) {
      await SurveyAnswer.destroy({
        where: { responseId: { [Op.in]: responses.map((row) => row.id) } },
      });
    }

    await SurveyResponse.destroy({ where: { surveyId: survey.id } });
    await SurveyQuestion.destroy({ where: { surveyId: survey.id } });
    await survey.destroy();

    successResponse(res, { deleted: true });
  } catch (error) {
    errorResponse(res, error);
  }
};

// draft <-> published <-> closed, set explicitly.
const setSurveyStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!Survey.STATUSES.includes(status)) {
      return res.status(400).json({
        status: false,
        message: `Status must be one of ${Survey.STATUSES.join(", ")}`,
      });
    }

    const survey = await Survey.findOne({ where: { uuid: req.params.uuid } });

    if (!survey) {
      return res
        .status(404)
        .json({ status: false, message: "Survey not found" });
    }

    if (status === "published") {
      const questions = await SurveyQuestion.count({
        where: { surveyId: survey.id },
      });

      if (questions === 0) {
        return res.status(400).json({
          status: false,
          message: "Add at least one question before publishing",
        });
      }
    }

    await survey.update({ status });

    successResponse(res, { uuid: survey.uuid, status });
  } catch (error) {
    errorResponse(res, error);
  }
};

// A startup submits its answers. One submission per startup per survey.
const submitResponse = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const survey = await Survey.findOne({
      where: { uuid: req.params.uuid },
      include: [questionInclude],
    });

    if (!survey) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Survey not found" });
    }

    const membership = await myMembership(req.user.id);

    if (
      !membership ||
      !membership.cohortProgramIds.includes(survey.cohortProgramId) ||
      survey.status !== "published"
    ) {
      await transaction.rollback();
      return res
        .status(403)
        .json({ status: false, message: "This survey is not open to you" });
    }

    const existing = await SurveyResponse.findOne({
      where: { surveyId: survey.id, businessId: membership.businessId },
    });

    if (existing && existing.submittedAt) {
      await transaction.rollback();
      return res.status(409).json({
        status: false,
        message: "You have already answered this survey",
      });
    }

    const questions = survey.SurveyQuestions || [];
    const byUuid = new Map(questions.map((row) => [row.uuid, row]));
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];

    const given = new Map();

    for (const answer of answers) {
      const question = byUuid.get(answer.questionUuid);
      if (!question) continue;
      given.set(question.id, { question, answer });
    }

    // Required questions must actually carry a value.
    for (const question of questions) {
      if (!question.required) continue;

      const entry = given.get(question.id);
      const value = entry && entry.answer;

      const empty =
        !value ||
        (question.questionType === "text" &&
          !String(value.answerText || "").trim()) ||
        (question.questionType === "rating" &&
          !Number.isFinite(Number(value.rating))) ||
        ((question.questionType === "single_choice" ||
          question.questionType === "multiple_choice") &&
          !(
            Array.isArray(value.selectedOptions) && value.selectedOptions.length
          ));

      if (empty) {
        await transaction.rollback();
        return res.status(400).json({
          status: false,
          message: `"${question.questionText}" is required`,
        });
      }
    }

    const response =
      existing ||
      (await SurveyResponse.create(
        {
          surveyId: survey.id,
          businessId: membership.businessId,
          userId: req.user.id,
        },
        { transaction },
      ));

    await SurveyAnswer.destroy({
      where: { responseId: response.id },
      transaction,
    });

    const rows = [];

    for (const [questionId, { question, answer }] of given) {
      rows.push({
        responseId: response.id,
        questionId,
        answerText:
          question.questionType === "text"
            ? String(answer.answerText || "").trim() || null
            : null,
        selectedOptions:
          question.questionType === "single_choice" ||
          question.questionType === "multiple_choice"
            ? (Array.isArray(answer.selectedOptions)
                ? answer.selectedOptions
                : []
              ).map(String)
            : null,
        rating:
          question.questionType === "rating" &&
          Number.isFinite(Number(answer.rating))
            ? Number(answer.rating)
            : null,
      });
    }

    if (rows.length) await SurveyAnswer.bulkCreate(rows, { transaction });

    await response.update({ submittedAt: new Date() }, { transaction });

    await transaction.commit();

    successResponse(res, { submitted: true });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

// What the programme's startups answered: a tally per question, plus who has
// responded so staff can chase the rest.
const getSurveyResults = async (req, res) => {
  try {
    const survey = await Survey.findOne({
      where: { uuid: req.params.uuid },
      include: [questionInclude],
    });

    if (!survey) {
      return res
        .status(404)
        .json({ status: false, message: "Survey not found" });
    }

    const questions = [...(survey.SurveyQuestions || [])].sort(
      (a, b) => a.position - b.position,
    );

    const responses = await SurveyResponse.findAll({
      where: { surveyId: survey.id, submittedAt: { [Op.ne]: null } },
      include: [{ model: Business, attributes: ["uuid", "name", "email"] }],
      order: [["submittedAt", "DESC"]],
    });

    const responseIds = responses.map((row) => row.id);

    const answers = responseIds.length
      ? await SurveyAnswer.findAll({
          where: { responseId: { [Op.in]: responseIds } },
          raw: true,
        })
      : [];

    const byQuestion = new Map();
    for (const answer of answers) {
      const list = byQuestion.get(answer.questionId) || [];
      list.push(answer);
      byQuestion.set(answer.questionId, list);
    }

    const members = await CohortMembership.count({
      where: { cohortProgramId: survey.cohortProgramId },
    });

    const results = questions.map((question) => {
      const list = byQuestion.get(question.id) || [];

      if (question.questionType === "text") {
        return {
          ...shapeQuestion(question),
          answers: list
            .map((row) => row.answerText)
            .filter((text) => String(text || "").trim()),
        };
      }

      if (question.questionType === "rating") {
        const values = list
          .map((row) => Number(row.rating))
          .filter((value) => Number.isFinite(value));

        return {
          ...shapeQuestion(question),
          count: values.length,
          // Null rather than 0 when nobody rated it.
          average: values.length
            ? Math.round(
                (values.reduce((sum, value) => sum + value, 0) /
                  values.length) *
                  10,
              ) / 10
            : null,
        };
      }

      const tally = new Map();

      for (const row of list) {
        for (const option of asList(row.selectedOptions)) {
          tally.set(option, (tally.get(option) || 0) + 1);
        }
      }

      return {
        ...shapeQuestion(question),
        counts: asList(question.options).map((option) => ({
          option,
          count: tally.get(option) || 0,
        })),
      };
    });

    successResponse(res, {
      uuid: survey.uuid,
      title: survey.title,
      status: survey.status,
      members,
      responded: responses.length,
      results,
      respondents: responses.map((row) => ({
        uuid: row.uuid,
        name: row.Business ? row.Business.name : null,
        email: row.Business ? row.Business.email : null,
        submittedAt: row.submittedAt,
      })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  getSurveys,
  getSurvey,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  setSurveyStatus,
  submitResponse,
  getSurveyResults,
};
