import { createFileRoute } from "@tanstack/react-router";

import { parseRecommendRequest } from "@/lib/recommend.functions";
import { recommend } from "@/lib/scoring-engine";

export const Route = createFileRoute("/api/public/recommend")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }
        try {
          const result = recommend(parseRecommendRequest(body));
          const status = "error" in result ? 422 : 200;
          return Response.json(result, { status });
        } catch (err) {
          return Response.json(
            { error: "bad_request", message: err instanceof Error ? err.message : "Unknown error" },
            { status: 400 },
          );
        }
      },
    },
  },
});
