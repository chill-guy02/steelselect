import { createServerFn } from "@tanstack/react-start";

import { recommend, type RecommendRequest, type RecommendResponse } from "./scoring-engine";

function parse(data: unknown): RecommendRequest {
  const d = (data ?? {}) as Record<string, unknown>;
  if (typeof d["application"] !== "string" || d["application"].trim() === "") {
    throw new Error("`application` is required");
  }
  const num = (v: unknown) =>
    v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v);
  const corrosion = d["corrosion"];
  const appColumn = d["app_column"];
  return {
    application: d["application"],
    app_column: typeof appColumn === "string" && appColumn.trim() !== "" ? appColumn : null,
    uts: num(d["uts"]),
    corrosion:
      corrosion === "Low" || corrosion === "Medium" || corrosion === "High" ? corrosion : null,
    hardness: num(d["hardness"]),
    toughness: num(d["toughness"]),
    min_temp: num(d["min_temp"]),
    max_temp: num(d["max_temp"]),
    weldability_required: Boolean(d["weldability_required"]),
    formability_required: Boolean(d["formability_required"]),
    cost_required: Boolean(d["cost_required"]),
  };
}

export const recommendGrades = createServerFn({ method: "POST" })
  .inputValidator(parse)
  .handler(async ({ data }): Promise<RecommendResponse> => recommend(data));

export { parse as parseRecommendRequest };
