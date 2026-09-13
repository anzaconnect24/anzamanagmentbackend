const { errorResponse, successResponse } = require("../../utils/responses");
const {
  Survey,
  SurveyQuestion,
  SurveyResponse,
  SurveyAnswer,
  SurveyRecipient,
  CohortProgram,
  CohortMembership,
  Business,
  User,
  sequelize,
} = require("../../models");
const { Op } = require("sequelize");

// Must stay in step with AUTHORS in survey.routes.js.
const AUTHOR_ROLES = ["ME"];

// The accounts a survey for "all startups" reaches.
const STARTUP_ROLE = "Enterprenuer";

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

const notFound = (res) =>
  res.status(404).json({ status: false, message: "Survey not found" });

// Everything that decides which surveys a person may answer: their role, the
// business they run if any, and the programmes that business is on, newest
// first. A startup's own list is built around the most recent programme.
const whoIs = async (user) => {
  const business = await Business.findOne({
    where: { userId: user.id },
    attributes: ["id"],
  });

  const memberships = business
    ? await CohortMembership.findAll({
        where: { businessId: business.id },
        attributes: ["cohortProgramId"],
        order: [["createdAt", "DESC"], ["id", "DESC"]],
        raw: true,
      })
    : [];

  return {
    userId: user.id,
    role: user.role,
    businessId: business ? business.id : null,
    cohortProgramIds: memberships.map((row) => row.cohortProgramId),
  };
};

// Whether this person may open and answer this survey. Nothing unpublished
// reaches anyone; after that, the survey's audience decides. One place, so
// listing, opening and submitting can never disagree about who is allowed.
const openTo = async (survey, me) => {
  if (survey.status !== "published") return false;

  if (survey.audience === "all_startups") {
    return me.role === STARTUP_ROLE && !!me.businessId;
  }

  if (survey.audience === "users") {
    const seat = await SurveyRecipient.findOne({
      where: { surveyId: survey.id, userId: me.userId },
      attributes: ["id"],
    });
    return !!seat;
  }

  return me.cohortProgramIds.includes(survey.cohortProgramId);
};

// Which existing response is this person's: per business for anyone who runs
// one, the way a startup has always been counted, and per account otherwise.
const responseKey = (me) =>
  me.businessId ? { businessId: me.businessId } : { userId: me.userId };

// Every activated startup account - the size of an "all startups" audience.
const startupCount = () =>
  User.count({ where: { role: STARTUP_ROLE, activated: true } });

// The accounts a list of uuids names, activated ones only, de-duplicated.
const usersFrom = async (uuids, transaction) => {
  const list = Array.isArray(uuids) ? [...new Set(uuids.map(String))] : [];
  if (!list.length) return [];

  return User.findAll({
    where: { uuid: { [Op.in]: list }, activated: true },
    attributes: ["id"],
    raw: true,
    transaction,
  });
};

const tallyBySurvey = (rows) =>
  rows.reduce(
    (map, row) => map.set(row.surveyId, (map.get(row.surveyId) || 0) + 1),
    new Map(),
  );

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

const summarise = (survey, extra) => ({
  uuid: survey.uuid,
  title: survey.title,
  description: survey.description,
  status: survey.status,
  audience: survey.audience,
  createdAt: survey.createdAt,
  questions: (survey.SurveyQuestions || []).length,
  ...extra,
});

// Listing surveys.
//
// The M&E Officer reads one programme's surveys by passing cohortProgram, or -
// without it - the surveys sent beyond a programme: to every startup, or to
// people by name. Each carries its response count and how many it was sent to.
//
// Anyone else gets every published survey addressed to them, however it was
// addressed, each marked with whether they have answered it.
const getSurveys = async (req, res) => {
  try {
    const { cohortProgram } = req.query;

    if (isAuthor(req)) {
      let program = null;
      const where = {};

      if (cohortProgram) {
        program = await CohortProgram.findOne({ where: { uuid: cohortProgram } });

        if (!program) {
          return res
            .status(404)
            .json({ status: false, message: "Program not found" });
        }

        where.cohortProgramId = program.id;
        where.audience = "program";
      } else {
        where.audience = { [Op.ne]: "program" };
      }

      const surveys = await Survey.findAll({
        where,
        include: [questionInclude],
        order: [["createdAt", "DESC"]],
      });

      const ids = surveys.map((row) => row.id);

      const [submitted, named, startups, members] = await Promise.all([
        ids.length
          ? SurveyResponse.findAll({
              attributes: ["surveyId"],
              where: { surveyId: { [Op.in]: ids }, submittedAt: { [Op.ne]: null } },
              raw: true,
            })
          : [],
        ids.length
          ? SurveyRecipient.findAll({
              attributes: ["surveyId"],
              where: { surveyId: { [Op.in]: ids } },
              raw: true,
            })
          : [],
        program ? 0 : startupCount(),
        program ? CohortMembership.count({ where: { cohortProgramId: program.id } }) : 0,
      ]);

      const responsesBy = tallyBySurvey(submitted);
      const recipientsBy = tallyBySurvey(named);

      return successResponse(res, {
        program,
        members,
        startups,
        data: surveys.map((survey) =>
          summarise(survey, {
            responses: responsesBy.get(survey.id) || 0,
            answered: false,
            audienceSize:
              survey.audience === "program"
                ? members
                : survey.audience === "all_startups"
                  ? startups
                  : recipientsBy.get(survey.id) || 0,
          }),
        ),
        count: surveys.length,
      });
    }

    const me = await whoIs(req.user);

    // A startup's page is built around its most recent programme.
    const program = me.cohortProgramIds.length
      ? await CohortProgram.findByPk(me.cohortProgramIds[0])
      : null;

    const named = await SurveyRecipient.findAll({
      where: { userId: me.userId },
      attributes: ["surveyId"],
      raw: true,
    });

    // Every way a survey can be addressed to this person.
    const reach = [];
    if (program) reach.push({ audience: "program", cohortProgramId: program.id });
    if (me.role === STARTUP_ROLE && me.businessId) reach.push({ audience: "all_startups" });
    if (named.length) {
      reach.push({
        audience: "users",
        id: { [Op.in]: named.map((row) => row.surveyId) },
      });
    }

    if (!reach.length) {
      return successResponse(res, { program: null, members: 0, data: [], count: 0 });
    }

    const surveys = await Survey.findAll({
      where: { status: "published", [Op.or]: reach },
      include: [questionInclude],
      order: [["createdAt", "DESC"]],
    });

    const ids = surveys.map((row) => row.id);

    const mine = ids.length
      ? await SurveyResponse.findAll({
          attributes: ["surveyId"],
          where: {
            surveyId: { [Op.in]: ids },
            submittedAt: { [Op.ne]: null },
            ...responseKey(me),
          },
          raw: true,
        })
      : [];

    const answered = new Set(mine.map((row) => row.surveyId));

    const members = program
      ? await CohortMembership.count({ where: { cohortProgramId: program.id } })
      : 0;

    successResponse(res, {
      program,
      members,
      data: surveys.map((survey) =>
        summarise(survey, { answered: answered.has(survey.id) }),
      ),
      count: surveys.length,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// One survey with its questions, in order. The M&E Officer also gets who a
// named survey was sent to, so the builder can show the list when editing.
const getSurvey = async (req, res) => {
  try {
    const survey = await Survey.findOne({
      where: { uuid: req.params.uuid },
      include: [questionInclude, { model: CohortProgram }],
    });

    if (!survey) return notFound(res);

    let answered = false;
    let recipients;

    if (isAuthor(req)) {
      if (survey.audience === "users") {
        const rows = await SurveyRecipient.findAll({
          where: { surveyId: survey.id },
          include: [{ model: User, as: "user", attributes: ["uuid", "name", "role"] }],
        });

        recipients = rows
          .filter((row) => row.user)
          .map((row) => ({
            uuid: row.user.uuid,
            name: row.user.name,
            role: row.user.role,
          }));
      }
    } else {
      const me = await whoIs(req.user);

      if (!(await openTo(survey, me))) {
        return res.status(403).json({
          status: false,
          message: "This survey is not open to you",
        });
      }

      const existing = await SurveyResponse.findOne({
        where: { surveyId: survey.id, ...responseKey(me) },
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
      audience: survey.audience,
      createdAt: survey.createdAt,
      program: survey.CohortProgram
        ? {
            uuid: survey.CohortProgram.uuid,
            title: survey.CohortProgram.title,
            category: survey.CohortProgram.category,
          }
        : null,
      questions: questions.map(shapeQuestion),
      ...(recipients ? { recipients } : {}),
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

  const refuse = async (code, message) => {
    await transaction.rollback();
    return res.status(code).json({ status: false, message });
  };

  try {
    const { cohortProgram, title, description, status, questions, userUuids } =
      req.body;

    if (!String(title || "").trim()) {
      return refuse(400, "A survey title is required");
    }

    // A survey started from a programme page arrives with that programme and no
    // audience, which is what every survey did before audiences existed.
    const audience = Survey.AUDIENCES.includes(req.body.audience)
      ? req.body.audience
      : cohortProgram
        ? "program"
        : null;

    if (!audience) {
      return refuse(400, "Choose who this survey goes to");
    }

    let program = null;

    if (audience === "program") {
      program = await CohortProgram.findOne({ where: { uuid: cohortProgram } });
      if (!program) return refuse(404, "Program not found");
    }

    let people = [];

    if (audience === "users") {
      people = await usersFrom(userUuids, transaction);
      if (!people.length) {
        return refuse(400, "Choose at least one person to send this survey to");
      }
    }

    const survey = await Survey.create(
      {
        cohortProgramId: program ? program.id : null,
        audience,
        title: String(title).trim(),
        description: description || null,
        status: Survey.STATUSES.includes(status) ? status : "draft",
        createdById: req.user ? req.user.id : null,
      },
      { transaction },
    );

    await saveQuestions(survey.id, questions, transaction);

    if (people.length) {
      await SurveyRecipient.bulkCreate(
        people.map((row) => ({ surveyId: survey.id, userId: row.id })),
        { transaction },
      );
    }

    await transaction.commit();

    successResponse(res, { uuid: survey.uuid });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

const updateSurvey = async (req, res) => {
  const transaction = await sequelize.transaction();

  const refuse = async (code, message) => {
    await transaction.rollback();
    return res.status(code).json({ status: false, message });
  };

  try {
    const survey = await Survey.findOne({ where: { uuid: req.params.uuid } });

    if (!survey) {
      await transaction.rollback();
      return notFound(res);
    }

    const { title, description, status, questions, userUuids } = req.body;

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
        return refuse(
          409,
          "This survey already has responses, so its questions can no longer be changed",
        );
      }

      await saveQuestions(survey.id, questions, transaction);
    }

    // Who it goes to. A programme's survey stays with its programme; one sent
    // beyond a programme can move between every startup and a named list, and
    // the list is rewritten wholesale, which is what editing it means.
    if (req.body.audience !== undefined || userUuids !== undefined) {
      if (survey.audience === "program") {
        if (req.body.audience !== undefined && req.body.audience !== "program") {
          return refuse(400, "A programme's survey cannot be sent to a different audience");
        }
      } else {
        const audience =
          req.body.audience !== undefined ? req.body.audience : survey.audience;

        if (!["all_startups", "users"].includes(audience)) {
          return refuse(400, "Send this survey to all startups or to chosen people");
        }

        await SurveyRecipient.destroy({ where: { surveyId: survey.id }, transaction });

        if (audience === "users") {
          const people = await usersFrom(userUuids, transaction);

          if (!people.length) {
            return refuse(400, "Choose at least one person to send this survey to");
          }

          await SurveyRecipient.bulkCreate(
            people.map((row) => ({ surveyId: survey.id, userId: row.id })),
            { transaction },
          );
        }

        await survey.update({ audience }, { transaction });
      }
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

    if (!survey) return notFound(res);

    // Questions, responses, answers and its recipient list go with it.
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
    await SurveyRecipient.destroy({ where: { surveyId: survey.id } });
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

    if (!survey) return notFound(res);

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

// Someone the survey is addressed to submits their answers, once.
const submitResponse = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const survey = await Survey.findOne({
      where: { uuid: req.params.uuid },
      include: [questionInclude],
    });

    if (!survey) {
      await transaction.rollback();
      return notFound(res);
    }

    const me = await whoIs(req.user);

    if (!(await openTo(survey, me))) {
      await transaction.rollback();
      return res
        .status(403)
        .json({ status: false, message: "This survey is not open to you" });
    }

    const existing = await SurveyResponse.findOne({
      where: { surveyId: survey.id, ...responseKey(me) },
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
          businessId: me.businessId,
          userId: me.userId,
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

// What respondents answered: a tally per question, plus who has responded so
// the M&E Officer can chase the rest. "members" is how many it was sent to,
// counted the way its audience is defined.
const getSurveyResults = async (req, res) => {
  try {
    const survey = await Survey.findOne({
      where: { uuid: req.params.uuid },
      include: [questionInclude],
    });

    if (!survey) return notFound(res);

    const questions = [...(survey.SurveyQuestions || [])].sort(
      (a, b) => a.position - b.position,
    );

    const responses = await SurveyResponse.findAll({
      where: { surveyId: survey.id, submittedAt: { [Op.ne]: null } },
      include: [
        { model: Business, attributes: ["uuid", "name", "email"] },
        { model: User, as: "respondent", attributes: ["uuid", "name", "email", "role"] },
      ],
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

    const members =
      survey.audience === "all_startups"
        ? await startupCount()
        : survey.audience === "users"
          ? await SurveyRecipient.count({ where: { surveyId: survey.id } })
          : await CohortMembership.count({
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
      audience: survey.audience,
      members,
      responded: responses.length,
      results,
      respondents: responses.map((row) => ({
        uuid: row.uuid,
        // A startup is named by its business; anyone else by their account.
        name: row.Business ? row.Business.name : row.respondent ? row.respondent.name : null,
        email: row.Business ? row.Business.email : row.respondent ? row.respondent.email : null,
        role: row.respondent ? row.respondent.role : null,
        submittedAt: row.submittedAt,
      })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Who a survey can be sent to by name: every activated account except the
// author's own, each with the business a startup runs so it can be found by
// its company name as well as the founder's.
const getAudiences = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { activated: true, id: { [Op.ne]: req.user.id } },
      attributes: ["id", "uuid", "name", "email", "role"],
      order: [["name", "ASC"]],
      raw: true,
    });

    const businesses = users.length
      ? await Business.findAll({
          where: { userId: { [Op.in]: users.map((row) => row.id) } },
          attributes: ["userId", "name"],
          raw: true,
        })
      : [];

    const businessOf = new Map(businesses.map((row) => [row.userId, row.name]));

    successResponse(res, {
      startups: users.filter((row) => row.role === STARTUP_ROLE).length,
      data: users.map((row) => ({
        uuid: row.uuid,
        name: row.name,
        email: row.email,
        role: row.role,
        business: businessOf.get(row.id) || null,
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
  getAudiences,
};
