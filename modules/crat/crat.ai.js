// AI scoring for CRAT.
//
// A startup submits its assessment and the platform scores it, question by
// question, against each question's own guidance — no staff reviewer sits in
// between. An Admin then decides whether the result is published.
//
// Server-side only: the API key never reaches the browser.

const OpenAI = require("openai");
const {
  CratAssessment,
  CratAnswer,
  CratQuestionCatalog,
  sequelize,
} = require("../../models");

const MODEL = process.env.OPENAI_CRAT_MODEL || "gpt-4o-mini";

// A score is 0–5 in whole steps, the same scale a reviewer used.
const clampScore = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(Math.max(Math.round(number), 0), 5);
};

// What the model is asked to judge: the question, the guidance written for it
// in the catalogue, and what the startup actually said.
const buildQuestionBlock = (answer) => {
  const question = answer.CratQuestionCatalog;

  const lines = [
    `### ${question.question_code}`,
    `Domain: ${question.domain}`,
    `Question: ${question.question_text_en}`,
    `Self-assessed score: ${answer.self_score ?? answer.score ?? "not given"} / 5`,
  ];

  if (question.ai_prompt) {
    lines.push(`Scoring guidance: ${question.ai_prompt}`);
  }

  lines.push(
    `Evidence provided: ${answer.evidence?.trim() || "none"}`,
    `Applicant comment: ${answer.entrepreneur_comment?.trim() || "none"}`,
  );

  return lines.join("\n");
};

const SYSTEM_PROMPT = [
  "You are a Capital Readiness Assessment (CRAT) analyst.",
  "You score a business's readiness question by question on a 0-5 scale, where",
  "0 means nothing is in place and 5 means it is fully in place with evidence.",
  "",
  "Score what the applicant has actually evidenced, not what they claim.",
  "A confident self-score with no supporting evidence is not a high score.",
  "Where a question carries scoring guidance, follow it exactly.",
  "Be consistent: the same evidence must earn the same score every time.",
  "",
  "Reply with JSON only, matching this shape:",
  '{"scores":[{"code":"<question code>","score":<0-5>,"comment":"<one or two sentences justifying the score>"}],',
  '"analysis":"<markdown: executive summary, domain findings, top 3 priority actions, and an overall verdict of Not Ready / Developing / Ready / Investment Ready>"}',
].join("\n");

// Ask the model to score the prompt. Separated out so the scoring logic can
// be exercised without calling the API.
const callOpenAi = async (prompt) => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured on the server");
  }

  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    // Scoring should be reproducible, so the temperature is low.
    temperature: 0.1,
    max_tokens: 4000,
  });

  return completion.choices?.[0]?.message?.content || "";
};

// Score one assessment and write the result back.
//
// Throws on failure so the caller can record why; it never leaves the
// assessment half-scored, because the writes run in one transaction.
const scoreAssessment = async (assessmentId, { callModel = callOpenAi } = {}) => {
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

  const scorable = answers.filter((answer) => answer.CratQuestionCatalog);

  if (scorable.length === 0) {
    throw new Error("This assessment has no answers to score");
  }

  const prompt = [
    "Score every question below. Return one entry per question code, and do",
    "not invent codes that are not listed.",
    "",
    ...scorable.map(buildQuestionBlock),
  ].join("\n\n");

  const raw = await callModel(prompt);

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The model did not return valid JSON");
  }

  const byCode = new Map(
    (Array.isArray(parsed.scores) ? parsed.scores : []).map((row) => [
      String(row.code || "").trim(),
      row,
    ]),
  );

  const now = new Date();
  let scored = 0;
  const missing = [];

  await sequelize.transaction(async (transaction) => {
    for (const answer of scorable) {
      const code = answer.CratQuestionCatalog.question_code;
      const result = byCode.get(String(code).trim());
      const score = result ? clampScore(result.score) : null;

      // A question the model skipped keeps its self-score rather than being
      // silently zeroed — and it is reported, so the gap is visible.
      if (score === null) {
        missing.push(code);
        continue;
      }

      await answer.update(
        {
          // Preserve what the applicant said the first time through.
          self_score:
            answer.self_score === null ? answer.score : answer.self_score,
          ai_score: score,
          ai_comment: result.comment || null,
          ai_scored_at: now,
          // score is what every report and snapshot reads, so it becomes the
          // AI's figure once scoring has run.
          score,
        },
        { transaction },
      );

      scored += 1;
    }

    await CratAssessment.update(
      {
        status: "ai_scored",
        ai_analysis: parsed.analysis || null,
        ai_scored_at: now,
        ai_model: MODEL,
        ai_error: missing.length
          ? `Not scored by the model: ${missing.join(", ")}`
          : null,
      },
      { where: { id: assessmentId }, transaction },
    );
  });

  return { scored, skipped: missing.length, model: MODEL };
};

// Run scoring without making the caller wait, and record why it failed if it
// does. Submitting must never fail because the model was slow or unavailable.
const scoreAssessmentInBackground = (assessmentId) => {
  scoreAssessment(assessmentId)
    .then((result) => {
      console.log(
        `CRAT ${assessmentId}: scored ${result.scored} answers with ${result.model}` +
          (result.skipped ? `, ${result.skipped} skipped` : ""),
      );
    })
    .catch(async (error) => {
      console.error(`CRAT ${assessmentId}: scoring failed —`, error.message);

      try {
        await CratAssessment.update(
          { status: "ai_failed", ai_error: error.message },
          { where: { id: assessmentId } },
        );
      } catch (updateError) {
        console.error(
          `CRAT ${assessmentId}: could not record the failure —`,
          updateError.message,
        );
      }
    });
};

module.exports = { scoreAssessment, scoreAssessmentInBackground, MODEL };
