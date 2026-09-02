"use strict";

// Server-side only OpenAI usage for Business Tools AI generation. Kept local
// to this module rather than shared with CRAT's own (separate, untouched)
// OpenAI usage in modules/crat/crat.controller.js — the API key never leaves
// this file, and this file is never imported by the frontend.
const OpenAI = require("openai");

const MODEL = "gpt-4o-mini";
// CRAT's analysis output uses 2000 tokens for a single review paragraph set.
// A generated business document has several structured sections, so it needs
// more headroom — 3000 is a moderate increase, not an open-ended one.
const MAX_OUTPUT_TOKENS = 3000;

const normalizeGeneratedContent = (parsed) => ({
  title: typeof parsed?.title === "string" ? parsed.title : "",
  summary: typeof parsed?.summary === "string" ? parsed.summary : "",
  sections: Array.isArray(parsed?.sections)
    ? parsed.sections
        .filter((section) => section && typeof section === "object")
        .map((section) => ({
          heading: typeof section.heading === "string" ? section.heading : "",
          content: typeof section.content === "string" ? section.content : "",
        }))
    : [],
});

// Executes one AI generation request and returns a normalized, predictable
// { title, summary, sections } object. Throws an Error with a `.code` of
// AI_NOT_CONFIGURED (no server-side key set) or AI_INVALID_RESPONSE (the
// model didn't return valid JSON) so the caller can map them to clean HTTP
// responses instead of a generic 500.
const generateStructuredContent = async ({ systemInstructions, userPrompt }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("AI generation is not configured on the server yet");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }

  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemInstructions },
      { role: "user", content: userPrompt },
    ],
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: 0.4,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices?.[0]?.message?.content || "";

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const parseError = new Error("AI response was not valid JSON");
    parseError.code = "AI_INVALID_RESPONSE";
    parseError.raw = raw;
    throw parseError;
  }

  return normalizeGeneratedContent(parsed);
};

module.exports = { generateStructuredContent };
