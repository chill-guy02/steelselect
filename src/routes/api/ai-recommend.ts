import { createFileRoute } from "@tanstack/react-router";

import { processAIRecommendation } from "@/lib/ai-recommend.functions";

export const Route = createFileRoute("/api/ai-recommend")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            {
              success: false,
              message: "Invalid JSON in request body.",
              isRecommendation: false,
              isGeneralQuestion: false,
              mentionedGradeUnavailable: null,
              selectedGrades: [],
              geminiConfigured: false,
              error: "invalid_json",
            },
            { status: 400 },
          );
        }

        try {
          const result = await processAIRecommendation(body);
          const status = result.success ? 200 : result.geminiConfigured ? 422 : 503;
          return Response.json(result, { status });
        } catch (err) {
          console.error(
            "[AI Mode] Unexpected server error:",
            err instanceof Error ? err.message : String(err),
          );
          return Response.json(
            {
              success: false,
              message:
                "An unexpected server error occurred while processing your request. Please try again.",
              isRecommendation: false,
              isGeneralQuestion: false,
              mentionedGradeUnavailable: null,
              selectedGrades: [],
              geminiConfigured: false,
              error: err instanceof Error ? err.message : "unknown_error",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
