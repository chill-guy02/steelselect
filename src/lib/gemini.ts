/**
 * Gemini API integration — server-side only.
 *
 * Gemini performs the COMPLETE AI reasoning for AI Mode:
 *   - Understands the user's natural-language requirements
 *   - Compares against the provided database material records
 *   - Selects suitable grades ONLY from those records
 *   - Explains the recommendation and trade-offs
 *
 * The backend enforces the database boundary: Gemini can only recommend
 * grades that exist in the database. The caller validates Gemini's output.
 *
 * GEMINI_API_KEY is read from the environment and NEVER exposed to the client.
 */

import { MATERIAL_DATA, getAllGradeNames } from "./ai-recommendation";

/* ------------------------------------------------------------------ *
 * Config
 * ------------------------------------------------------------------ */

const PRIMARY_MODEL = "gemini-3.8-flash";
const FALLBACK_MODEL = "gemini-3.7-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const RETRYABLE_STATUS = new Set([429, 503]);
const RETRY_DELAYS_MS = [1000, 2000, 4000];

function getApiKey(): string | null {
  const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
  return env.GEMINI_API_KEY ?? env.gemini_api_key ?? null;
}

export function isGeminiConfigured(): boolean {
  return getApiKey() != null;
}

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/**
 * Internal message format used between functions in this file.
 * Converted to Gemini's REST format before sending.
 */
export interface GeminiMessage {
  role: "user" | "model";
  content: string;
}

export interface GeminiGradeSelection {
  grade: string;
  reason: string;
}

export interface GeminiAIResponse {
  isRecommendation: boolean;
  isGeneralQuestion: boolean;
  mentionedGradeUnavailable: string | null;
  selectedGrades: GeminiGradeSelection[];
  explanation: string;
}

/* ------------------------------------------------------------------ *
 * Gemini REST API types (the wire format)
 * ------------------------------------------------------------------ */

interface GeminiRestContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

interface GeminiRestResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number; status?: string };
}

/* ------------------------------------------------------------------ *
 * Low-level Gemini call (single attempt, no retry)
 * ------------------------------------------------------------------ */

async function callGeminiOnce(
  model: string,
  systemPrompt: string,
  userMessage: string,
  conversationHistory: GeminiMessage[],
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  // Build contents in Gemini REST format: each item must have { role, parts: [{ text }] }
  const contents: GeminiRestContent[] = [];

  for (const msg of conversationHistory) {
    contents.push({
      role: msg.role,
      parts: [{ text: msg.content }],
    });
  }

  // Add the current user message
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  };

  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (fetchErr) {
    throw new Error(
      `Network error reaching Gemini API: ${fetchErr instanceof Error ? fetchErr.message : "unknown"}`,
    );
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    const err = new Error(
      `Gemini API returned HTTP ${resp.status}: ${errText.slice(0, 300)}`,
    ) as Error & { status?: number };
    err.status = resp.status;
    throw err;
  }

  const data = (await resp.json()) as GeminiRestResponse;

  if (data.error) {
    throw new Error(
      `Gemini API error: ${data.error.message ?? "Unknown"}${data.error.status ? ` (status: ${data.error.status})` : ""}`,
    );
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const finishReason = data.candidates?.[0]?.finishReason;

  if (!text) {
    throw new Error(
      `Gemini returned an empty response (finishReason: ${finishReason ?? "unknown"})`,
    );
  }

  return text;
}

/* ------------------------------------------------------------------ *
 * Gemini call with retry + model fallback
 * ------------------------------------------------------------------ */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiWithRetry(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: GeminiMessage[],
): Promise<string> {
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];

  let lastError: Error | null = null;

  for (let m = 0; m < models.length; m++) {
    const model = models[m];
    const isLastModel = m === models.length - 1;

    console.log(`[AI Mode] Using model: ${model} (attempt ${m + 1}/${models.length})`);

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        if (attempt > 0) {
          const delay = RETRY_DELAYS_MS[attempt - 1];
          console.log(`[AI Mode] Retrying ${model} in ${delay}ms (attempt ${attempt + 1})...`);
          await sleep(delay);
        }

        const text = await callGeminiOnce(model, systemPrompt, userMessage, conversationHistory);
        console.log(`[AI Mode] Gemini response received (${text.length} chars) from ${model}`);
        return text;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const status = (err as Error & { status?: number }).status;

        const retryable = status != null && RETRYABLE_STATUS.has(status);
        const moreRetries = attempt < RETRY_DELAYS_MS.length;

        if (retryable && moreRetries) {
          console.warn(`[AI Mode] ${model} returned HTTP ${status} — will retry (${moreRetries ? "yes" : "no"})`);
          continue;
        }

        if (retryable && !moreRetries && !isLastModel) {
          console.warn(`[AI Mode] ${model} exhausted retries (HTTP ${status}) — falling back to ${FALLBACK_MODEL}`);
          break;
        }

        // Non-retryable error, or last model exhausted — throw
        if (!retryable) {
          console.error(`[AI Mode] ${model} failed (non-retryable): ${lastError.message}`);
        }
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error("Gemini API failed after all retries and fallbacks.");
}

/* ------------------------------------------------------------------ *
 * Database material data formatting
 * ------------------------------------------------------------------ */

function formatMaterialRecord(g: (typeof MATERIAL_DATA)[number]): string {
  return [
    `{`,
    `  "grade": "${g.grade}",`,
    `  "name": "${g.name}",`,
    `  "type": "${g.type}",`,
    `  "standard": "${g.standard}",`,
    `  "uts": ${g.uts},`,
    `  "yieldStrength": ${g.yieldStrength},`,
    `  "hardness": ${g.hardness},`,
    `  "elongation": ${g.elongation},`,
    `  "chromium": ${g.chromium},`,
    `  "molybdenum": ${g.molybdenum},`,
    `  "nitrogen": ${g.nitrogen},`,
    `  "pren": ${g.pren},`,
    `  "prenIndex": "${g.prenIndex}",`,
    `  "minServiceTemp": ${g.minServiceTemp},`,
    `  "maxServiceTemp": ${g.maxServiceTemp},`,
    `  "weldability": ${g.weldability},`,
    `  "formability": ${g.formability},`,
    `  "cost": ${g.cost},`,
    `  "treatment": "${g.treatment}",`,
    `  "description": "${g.description || "N/A"}"`,
    `}`,
  ].join("\n");
}

function buildMaterialDatabaseContext(): string {
  const records = MATERIAL_DATA.map(formatMaterialRecord).join(",\n");
  return `[\n${records}\n]`;
}

/* ------------------------------------------------------------------ *
 * System prompt — Gemini does ALL reasoning
 * ------------------------------------------------------------------ */

function buildSystemPrompt(): string {
  const dbJson = buildMaterialDatabaseContext();
  const gradeNames = getAllGradeNames().join(", ");

  return `You are an expert materials engineering assistant for stainless steel selection. You help non-technical users find the right stainless steel grade.

You have access to a CLOSED DATABASE of stainless steel grades with their material properties. This is the ONLY set of grades you can recommend.

DATABASE (JSON array of material property records):
${dbJson}

AVAILABLE GRADE NAMES: ${gradeNames}

YOUR TASK:
1. Understand the user's natural-language requirements (they may not know technical terms).
2. Compare the user's requirements against the material properties in the database above.
3. Select the 1-5 most suitable grades from the database. You may ONLY select grades that exist in the database.
4. Explain why each grade fits, using ONLY the actual property values from the database.
5. Explain important trade-offs between the recommended grades.
6. If important application information is missing, do NOT pretend the recommendation is definitive. Add a clear preliminary note and ask 1-3 high-value clarification questions that could materially change the recommendation.

HANDLING INCOMPLETE OR AMBIGUOUS REQUIREMENTS:
- If the user's description is vague (e.g., "I need stainless steel for a chemical plant"), recognize that key factors like chemical type, concentration, temperature, and exposure conditions may materially affect grade selection.
- Provide a PRELIMINARY recommendation when possible, but clearly label it as preliminary.
- Include a note such as: "Preliminary recommendation — the final grade depends on [specific missing factors]."
- Ask 1-3 high-value clarification questions. Prioritize questions that can materially change the recommendation:
  - What chemical or environment will the material be exposed to?
  - What operating temperature range is expected?
  - Is welding or deep forming required?
  - Is chloride exposure expected?
- Do NOT ask for every possible engineering parameter — only ask about factors that could change the grade selection.
- NEVER invent missing values. If a property is unknown, say so.
- When the user answers the clarification questions, update the recommendation accordingly.
- If the user's follow-up does NOT change the recommendation, keep the existing recommendation and explain why.

CRITICAL RULES:
- You may ONLY recommend grades that exist in the database above. NEVER invent or suggest a grade not in the database.
- NEVER invent, estimate, or hallucinate any material property value. Every number you mention must come from the database.
- If a property is missing or "N/A", say it is unavailable — do not guess.
- If the user asks about a specific grade not in the database, set "mentionedGradeUnavailable" to that grade name and explain it is not available.
- If no grade in the database satisfies the user's hard requirements, say so clearly. Do not force a recommendation.
- Use simple, non-technical language. Explain technical terms (UTS, PREN, yield strength, etc.) when first used.
- PREN = Pitting Resistance Equivalent Number (Cr + 3.3*Mo + 16*N). Higher = better corrosion resistance.
- Cost score: higher = more affordable. Lower = more expensive.
- Weldability/Formability scores: higher = better.

OUTPUT QUALITY RULES (VERY IMPORTANT):
- The "reason" field for each selected grade must be a SHORT, human-friendly paragraph (2-3 sentences) explaining WHY the grade fits the user's requirements in plain language.
- NEVER expose raw internal scores like "Cost score: 12.7" or "Weldability score: 92.49" in the reason text. Instead, translate scores into qualitative labels: "excellent weldability", "moderate cost", "high corrosion resistance", etc.
- NEVER list property values as a data dump (e.g., "UTS: 710, YS: 420, PREN: 31.4"). Instead, weave relevant values into natural sentences.
- Do NOT include manufacturing-condition terminology (e.g., "Hot_Finished", "Cold_Finished") in the grade name you provide in the "grade" field — use the exact database grade name as-is, but in the "reason" field refer to the grade by its base name only (e.g., "AISI 317" not "AISI 317 (Hot_Finished)").
- If two grades are the same material in different conditions (e.g., Hot Finished vs Cold Finished), only recommend the one that best matches the user's needs — do NOT present both as separate options unless the condition materially changes the recommendation.
- The "explanation" field should be a brief intro (1-2 sentences) summarizing the recommendation. Do NOT repeat all property details here — the card UI will display them. Focus on the overall recommendation logic and any caveats.

RESPONSE FORMAT:
You must respond with ONLY a valid JSON object (no markdown, no code fences) matching this structure:
{
  "isRecommendation": true/false,
  "isGeneralQuestion": true/false,
  "mentionedGradeUnavailable": null or "grade name the user asked about that is not in the database",
  "selectedGrades": [
    {
      "grade": "exact grade name from the database",
      "reason": "2-3 sentence plain-language explanation of why this grade fits the user's requirements. Use qualitative labels (e.g., 'excellent weldability', 'high corrosion resistance') instead of raw scores. Mention the user's specific application or environment."
    }
  ],
  "explanation": "1-3 sentence summary of the recommendation. Do NOT dump property values here — the UI displays them in cards. If requirements are incomplete or ambiguous, include a preliminary note and 1-3 clarifying questions here. Mention any requirements that could not be evaluated."
}

GUIDELINES:
- Set "isRecommendation" to true if you are recommending grades. Set to false for general questions or follow-ups.
- Set "isGeneralQuestion" to true if the user is asking a general question (e.g., "What is PREN?", "Explain UTS").
- "selectedGrades" should be empty if no suitable grade exists or if it's a general question.
- The "explanation" is a brief intro shown above the recommendation cards. Keep it short.
- For follow-up questions in a conversation, use the conversation context to maintain relevance.`;
}

/* ------------------------------------------------------------------ *
 * Main entry — single Gemini call for complete AI reasoning
 * ------------------------------------------------------------------ */

export async function processWithGemini(
  userMessage: string,
  applicationContext: string | null,
  environment: string | null,
  costPreference: string | null,
  conversationHistory: GeminiMessage[] = [],
): Promise<GeminiAIResponse> {
  const contextPrefix = [
    applicationContext ? `Application context (from UI): ${applicationContext}` : null,
    environment ? `Environment (from UI): ${environment}` : null,
    costPreference ? `Cost preference (from UI): ${costPreference}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const fullMessage = contextPrefix
    ? `${contextPrefix}\n\nUser message: ${userMessage}`
    : userMessage;

  console.log("[AI Mode] Building system prompt with database context...");
  const systemPrompt = buildSystemPrompt();
  console.log(`[AI Mode] System prompt length: ${systemPrompt.length} chars`);
  console.log(`[AI Mode] History messages: ${conversationHistory.length}`);

  const raw = await callGeminiWithRetry(systemPrompt, fullMessage, conversationHistory);

  // Parse the JSON response
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }

  let parsed: GeminiAIResponse;
  try {
    parsed = JSON.parse(cleaned) as GeminiAIResponse;
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]) as GeminiAIResponse;
      } catch (parseErr) {
        console.error("[AI Mode] Failed to parse Gemini JSON response:", parseErr instanceof Error ? parseErr.message : String(parseErr));
        console.error("[AI Mode] Raw response (first 500 chars):", cleaned.slice(0, 500));
        throw new Error("Gemini returned an invalid response that could not be parsed as JSON.");
      }
    } else {
      console.error("[AI Mode] No JSON found in Gemini response");
      console.error("[AI Mode] Raw response (first 500 chars):", cleaned.slice(0, 500));
      throw new Error("Gemini returned an invalid response with no JSON content.");
    }
  }

  // Validate structure
  if (typeof parsed.explanation !== "string" || !parsed.explanation) {
    console.error("[AI Mode] Gemini response missing explanation field");
    throw new Error("Gemini response missing required 'explanation' field.");
  }
  if (!Array.isArray(parsed.selectedGrades)) {
    parsed.selectedGrades = [];
  }

  console.log(`[AI Mode] Gemini response parsed successfully. isRecommendation: ${parsed.isRecommendation}, selectedGrades: ${parsed.selectedGrades.length}`);

  return parsed;
}
