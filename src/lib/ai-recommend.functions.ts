/**
 * AI Mode — server-side processing function.
 *
 * This is a PLAIN async function, NOT a TanStack createServerFn.
 * The API route calls this function directly.
 *
 * Architecture:
 *   User message → Gemini (understands requirements, compares DB, selects grades, explains)
 *   → Backend validates grade selections against the database
 *   → Response
 *
 * Gemini performs the complete AI reasoning. The backend enforces the
 * database boundary: only grades that exist in the database are allowed.
 */

import { MATERIAL_DATA, type MaterialPropertyRecord } from "./ai-recommendation";
import {
  isGeminiConfigured,
  processWithGemini,
  type GeminiAIResponse,
  type GeminiGradeSelection,
  type GeminiMessage,
} from "./gemini";

/* ------------------------------------------------------------------ *
 * Request / Response types
 * ------------------------------------------------------------------ */

export interface AIRecommendRequest {
  application: string | null;
  environment: string | null;
  costPreference: string | null;
  message: string;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
}

export interface AIValidatedGrade {
  grade: string;
  reason: string;
  properties: MaterialPropertyRecord;
}

export interface AIRecommendResponse {
  success: boolean;
  message: string;
  isRecommendation: boolean;
  isGeneralQuestion: boolean;
  mentionedGradeUnavailable: string | null;
  selectedGrades: AIValidatedGrade[];
  error?: string;
  geminiConfigured: boolean;
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

function validateInput(input: unknown): AIRecommendRequest {
  const d = (input ?? {}) as Record<string, unknown>;
  const message = typeof d["message"] === "string" ? d["message"].trim() : "";
  if (!message) {
    throw new Error("Message is required.");
  }
  if (message.length > 2000) {
    throw new Error("Message is too long (max 2000 characters).");
  }

  const history = Array.isArray(d["conversationHistory"])
    ? (d["conversationHistory"] as { role: string; content: string }[])
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
    : [];

  const trimmedHistory = history.slice(-10);

  return {
    application: typeof d["application"] === "string" ? d["application"] : null,
    environment: typeof d["environment"] === "string" ? d["environment"] : null,
    costPreference: typeof d["costPreference"] === "string" ? d["costPreference"] : null,
    message,
    conversationHistory: trimmedHistory,
  };
}

/* ------------------------------------------------------------------ *
 * Database boundary enforcement
 * ------------------------------------------------------------------ */

function findGradeInDatabase(gradeName: string): MaterialPropertyRecord | null {
  const q = gradeName.toLowerCase().trim();
  return (
    MATERIAL_DATA.find((g) => g.grade.toLowerCase() === q) ??
    MATERIAL_DATA.find((g) => g.grade.toLowerCase().includes(q)) ??
    MATERIAL_DATA.find((g) => g.name.toLowerCase().includes(q)) ??
    null
  );
}

/**
 * Validate Gemini's grade selections against the database.
 * Any grade not in the database is filtered out and flagged.
 */
function validateGradeSelections(
  selections: GeminiGradeSelection[],
): { valid: AIValidatedGrade[]; invalid: string[] } {
  const valid: AIValidatedGrade[] = [];
  const invalid: string[] = [];

  for (const sel of selections) {
    const dbGrade = findGradeInDatabase(sel.grade);
    if (dbGrade) {
      valid.push({
        grade: dbGrade.grade,
        reason: sel.reason,
        properties: dbGrade,
      });
    } else {
      invalid.push(sel.grade);
      console.warn(`[AI Mode] Gemini selected grade "${sel.grade}" which is NOT in the database — filtered out.`);
    }
  }

  return { valid, invalid };
}

/* ------------------------------------------------------------------ *
 * Main processing function — called directly by the API route
 * ------------------------------------------------------------------ */

export async function processAIRecommendation(input: unknown): Promise<AIRecommendResponse> {
  console.log("[AI Mode] Request reached AI handler");

  let data: AIRecommendRequest;
  try {
    data = validateInput(input);
  } catch (err) {
    console.error("[AI Mode] Validation error:", err instanceof Error ? err.message : String(err));
    return {
      success: false,
      message: "Invalid request: " + (err instanceof Error ? err.message : "validation failed."),
      isRecommendation: false,
      isGeneralQuestion: false,
      mentionedGradeUnavailable: null,
      selectedGrades: [],
      geminiConfigured: isGeminiConfigured(),
      error: "validation_error",
    };
  }

  const geminiConfigured = isGeminiConfigured();
  console.log(`[AI Mode] GEMINI_API_KEY detected: ${geminiConfigured}`);

  if (!geminiConfigured) {
    return {
      success: false,
      message:
        "The AI service is not configured. The GEMINI_API_KEY environment variable must be set to enable AI Mode. Please contact the administrator.",
      isRecommendation: false,
      isGeneralQuestion: false,
      mentionedGradeUnavailable: null,
      selectedGrades: [],
      geminiConfigured: false,
      error: "GEMINI_API_KEY not set",
    };
  }

  // Convert conversation history to Gemini format
  const geminiHistory: GeminiMessage[] = data.conversationHistory.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    content: m.content,
  }));

  let geminiResult: GeminiAIResponse;
  try {
    geminiResult = await processWithGemini(
      data.message,
      data.application,
      data.environment,
      data.costPreference,
      geminiHistory,
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("[AI Mode] Gemini processing error:", errorMsg);

    // Determine error type for structured response
    let errorCode = "gemini_request_failed";
    if (errorMsg.includes("GEMINI_API_KEY") || errorMsg.includes("not configured")) {
      errorCode = "gemini_not_configured";
    } else if (errorMsg.includes("Network error")) {
      errorCode = "gemini_network_error";
    } else if (errorMsg.includes("invalid response") || errorMsg.includes("could not be parsed") || errorMsg.includes("missing required")) {
      errorCode = "gemini_parse_error";
    } else if (errorMsg.includes("HTTP 4")) {
      errorCode = "gemini_client_error";
    } else if (errorMsg.includes("HTTP 5")) {
      errorCode = "gemini_server_error";
    }

    return {
      success: false,
      message: `AI service error: ${errorMsg}`,
      isRecommendation: false,
      isGeneralQuestion: false,
      mentionedGradeUnavailable: null,
      selectedGrades: [],
      geminiConfigured: true,
      error: errorCode,
    };
  }

  // Validate Gemini's grade selections against the database
  const { valid: validatedGrades, invalid: invalidGrades } = validateGradeSelections(
    geminiResult.selectedGrades ?? [],
  );

  if (invalidGrades.length > 0) {
    console.warn(`[AI Mode] ${invalidGrades.length} grade(s) from Gemini were not in the database and were removed.`);
  }

  // If Gemini said it's a recommendation but all grades were invalid, adjust the message
  let finalMessage = geminiResult.explanation;
  if (
    geminiResult.isRecommendation &&
    validatedGrades.length === 0 &&
    invalidGrades.length > 0 &&
    !geminiResult.mentionedGradeUnavailable
  ) {
    finalMessage =
      "I was unable to find suitable grades in the current material database for your requirements. " +
      finalMessage;
  }

  return {
    success: true,
    message: finalMessage,
    isRecommendation: geminiResult.isRecommendation,
    isGeneralQuestion: geminiResult.isGeneralQuestion,
    mentionedGradeUnavailable: geminiResult.mentionedGradeUnavailable,
    selectedGrades: validatedGrades,
    geminiConfigured: true,
  };
}
