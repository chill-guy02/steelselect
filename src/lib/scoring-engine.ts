/**
 * Stainless Steel Grade Recommender — scoring engine.
 *
 * Pure, dependency-free computation over the SS database (Sheet1, rows where
 * Category == "Stainless Steel", exported to src/data/stainless-grades.json).
 * Preprocessing runs ONCE at module load, not per request.
 */

import rawGrades from "@/data/stainless-grades.json";

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type PrenIndex = "Low" | "Medium" | "High";

export type ParamKey =
  | "UTS"
  | "corrosion"
  | "hardness"
  | "temperature"
  | "weldability"
  | "formability"
  | "cost";

export interface RawGrade {
  grade: string;
  name: string;
  type: string;
  standard: string;
  description: string;
  hardness: number;
  uts: number;
  ys: number;
  elongation: number | null;
  crMin: number;
  crMax: number;
  moMin: number;
  moMax: number;
  nMin: number;
  nMax: number;
  minServiceTemp: number;
  maxServiceTemp: number;
  weldability: number;
  formability: number;
  cost: number;
  treatment: string;
}

export interface PreparedGrade extends RawGrade {
  baseGrade: string;
  crAvg: number;
  moAvg: number;
  nAvg: number;
  pren: number;
  prenIndex: PrenIndex;
}

export interface RecommendRequest {
  application: string;
  uts?: number | null;
  corrosion?: PrenIndex | null;
  hardness?: number | null;
  /** Accepted for frontend compatibility, currently ignored (no data column). */
  toughness?: number | null;
  min_temp?: number | null;
  max_temp?: number | null;
  weldability_required?: boolean;
  formability_required?: boolean;
  cost_required?: boolean;
}

export interface RecommendedGrade {
  name: string;
  common_name: string;
  type: string;
  final_score: number;
  strength_bar: number;
  corrosion_bar: number;
  /** null => "data not available"; no toughness column exists in the dataset. */
  toughness_bar: number | null;
  temp_bar: number;
  why_this_grade: string;
  trade_offs: string[];
  /** Supporting detail for the UI detail view (not part of the scoring contract). */
  details: {
    uts: number;
    ys: number;
    hardness: number;
    pren: number;
    pren_index: PrenIndex;
    min_service_temp: number;
    max_service_temp: number;
    weldability_score: number;
    formability_score: number;
    cost_score: number;
    standard: string;
    treatment: string;
    description: string;
  };
  /** Per-parameter normalized scores (0-100) for the comparison table. */
  parameter_scores: Partial<Record<ParamKey, number>>;
}

export interface RecommendSuccess {
  recommended_grade: RecommendedGrade;
  alternatives: RecommendedGrade[];
  criteria_used: ParamKey[];
  application: string;
  confidence: "Baseline" | "Standard" | "High";
}

export interface RecommendFailure {
  error: "no_match";
  closest_grades: { name: string; type: string; failed: ParamKey[] }[];
  failed_on: ParamKey[];
}

export type RecommendResponse = RecommendSuccess | RecommendFailure;

/* ------------------------------------------------------------------ *
 * Preprocessing (once at load)
 * ------------------------------------------------------------------ */

// TODO: confirm with metallurgy lead — placeholder PREN bucket thresholds.
export const PREN_THRESHOLDS = { lowMax: 20, mediumMax: 30 };

function prenBucket(pren: number): PrenIndex {
  if (pren < PREN_THRESHOLDS.lowMax) return "Low";
  if (pren <= PREN_THRESHOLDS.mediumMax) return "Medium";
  return "High";
}

const PREN_RANK: Record<PrenIndex, number> = { Low: 1, Medium: 2, High: 3 };

/** Strip anything in parentheses: "AISI 316 (Cold_finished)" -> "AISI 316". */
export function baseGradeName(grade: string): string {
  return grade.replace(/\s*\([^)]*\)/g, "").trim();
}

export const GRADES: PreparedGrade[] = (rawGrades as RawGrade[]).map((g) => {
  const crAvg = (g.crMin + g.crMax) / 2;
  const moAvg = (g.moMin + g.moMax) / 2;
  const nAvg = (g.nMin + g.nMax) / 2;
  const pren = crAvg + 3.3 * moAvg + 16 * nAvg;
  return {
    ...g,
    baseGrade: baseGradeName(g.grade),
    crAvg,
    moAvg,
    nAvg,
    pren,
    prenIndex: prenBucket(pren),
  };
});

/* ------------------------------------------------------------------ *
 * Application weight profiles (must sum to 1.0)
 * ------------------------------------------------------------------ */

export type WeightProfile = Record<
  "UTS" | "corrosion" | "hardness" | "weldability" | "formability" | "cost",
  number
>;

// Placeholder defaults — team should adjust based on domain expertise.
// Toughness intentionally omitted until a real data column exists; if added,
// renormalize weights across all seven parameters.
export const APPLICATION_WEIGHTS: Record<string, WeightProfile> = {
  Construction: { UTS: 0.15, corrosion: 0.3, hardness: 0.05, weldability: 0.2, formability: 0.2, cost: 0.1 },
  Shipbuilding: { UTS: 0.15, corrosion: 0.4, hardness: 0.05, weldability: 0.2, formability: 0.1, cost: 0.1 },
  "Automotive / Mobility": { UTS: 0.2, corrosion: 0.15, hardness: 0.1, weldability: 0.15, formability: 0.25, cost: 0.15 },
  Railways: { UTS: 0.2, corrosion: 0.2, hardness: 0.1, weldability: 0.2, formability: 0.15, cost: 0.15 },
  "Consumer Products": { UTS: 0.1, corrosion: 0.2, hardness: 0.05, weldability: 0.15, formability: 0.3, cost: 0.2 },
};

/** Temperature has no default weight of its own; it borrows this share when active. */
const TEMPERATURE_WEIGHT = 0.15;

/** Hardness filter tolerance: ±15% band around the requested Brinell value. */
export const HARDNESS_TOLERANCE = 0.15;

const WHY_PLACEHOLDER =
  "Recommendation based on overall property fit for this application — detailed reasoning coming in a future update.";
const TRADE_OFFS_PLACEHOLDER = ["Trade-off detail coming soon"];

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function normalizeSet(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 1);
  return values.map((v) => (v - min) / (max - min));
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

/** Normalized position of the requested range within the grade's service range. */
function tempSuitability(g: PreparedGrade, minReq: number | null, maxReq: number | null) {
  const span = g.maxServiceTemp - g.minServiceTemp;
  if (span <= 0) return 0;
  if (minReq === null && maxReq === null) return clamp01(span / 1100);
  const lo = minReq ?? g.minServiceTemp;
  const hi = maxReq ?? g.maxServiceTemp;
  const lowerMargin = lo - g.minServiceTemp;
  const upperMargin = g.maxServiceTemp - hi;
  if (lowerMargin < 0 || upperMargin < 0) return 0;
  return clamp01((lowerMargin + upperMargin) / span);
}

function filterChecks(g: PreparedGrade, req: RecommendRequest): ParamKey[] {
  const failed: ParamKey[] = [];
  if (req.uts != null && !(g.uts >= req.uts)) failed.push("UTS");
  if (req.corrosion != null && PREN_RANK[g.prenIndex] < PREN_RANK[req.corrosion]) failed.push("corrosion");
  if (req.hardness != null) {
    const lo = req.hardness * (1 - HARDNESS_TOLERANCE);
    const hi = req.hardness * (1 + HARDNESS_TOLERANCE);
    if (g.hardness < lo || g.hardness > hi) failed.push("hardness");
  }
  if (req.min_temp != null || req.max_temp != null) {
    const lo = req.min_temp ?? g.minServiceTemp;
    const hi = req.max_temp ?? g.maxServiceTemp;
    if (g.minServiceTemp > lo || g.maxServiceTemp < hi) failed.push("temperature");
  }
  return failed;
}

/* ------------------------------------------------------------------ *
 * Main entry point
 * ------------------------------------------------------------------ */

export function recommend(req: RecommendRequest): RecommendResponse {
  const profile = APPLICATION_WEIGHTS[req.application];
  if (!profile) {
    throw new Error(
      `Unknown application "${req.application}". Expected one of: ${Object.keys(APPLICATION_WEIGHTS).join(", ")}`,
    );
  }

  // 1. Active parameters (toughness deliberately excluded — no data).
  const active: ParamKey[] = [];
  if (req.uts != null) active.push("UTS");
  if (req.corrosion != null) active.push("corrosion");
  if (req.hardness != null) active.push("hardness");
  if (req.min_temp != null || req.max_temp != null) active.push("temperature");
  if (req.weldability_required) active.push("weldability");
  if (req.formability_required) active.push("formability");
  if (req.cost_required) active.push("cost");

  const baseline = active.length === 0;

  // 3. Hard filter (skipped entirely for the baseline path).
  let survivors = GRADES;
  if (!baseline) {
    const failures = GRADES.map((g) => ({ g, failed: filterChecks(g, req) }));
    survivors = failures.filter((f) => f.failed.length === 0).map((f) => f.g);

    // 4. No survivors -> explain which filter did the most damage.
    if (survivors.length === 0) {
      const counts = new Map<ParamKey, number>();
      for (const f of failures) for (const k of f.failed) counts.set(k, (counts.get(k) ?? 0) + 1);
      const failed_on = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
      const closest = [...failures]
        .sort((a, b) => a.failed.length - b.failed.length)
        .slice(0, 3)
        .map((f) => ({ name: f.g.grade, type: f.g.type, failed: f.failed }));
      return { error: "no_match", closest_grades: closest, failed_on };
    }
  }

  // 5. Renormalize weights over the active parameters.
  const scoringParams: ParamKey[] = baseline
    ? (["UTS", "corrosion", "hardness", "weldability", "formability", "cost"] as ParamKey[])
    : active;

  const rawWeights = new Map<ParamKey, number>();
  for (const p of scoringParams) {
    rawWeights.set(p, p === "temperature" ? TEMPERATURE_WEIGHT : profile[p as keyof WeightProfile]);
  }
  const weightSum = [...rawWeights.values()].reduce((a, b) => a + b, 0);
  const weights = new Map<ParamKey, number>();
  for (const p of scoringParams) weights.set(p, (rawWeights.get(p) ?? 0) / weightSum);

  // 6. Normalize each property relative to the surviving set.
  const normalized = new Map<ParamKey, number[]>([
    ["UTS", normalizeSet(survivors.map((g) => (g.uts + g.ys) / 2))],
    ["corrosion", normalizeSet(survivors.map((g) => g.pren))],
    [
      "hardness",
      normalizeSet(
        survivors.map((g) =>
          req.hardness != null ? -Math.abs(g.hardness - req.hardness) : g.hardness,
        ),
      ),
    ],
    [
      "temperature",
      normalizeSet(
        survivors.map((g) => tempSuitability(g, req.min_temp ?? null, req.max_temp ?? null)),
      ),
    ],
    ["weldability", normalizeSet(survivors.map((g) => g.weldability))],
    ["formability", normalizeSet(survivors.map((g) => g.formability))],
    ["cost", normalizeSet(survivors.map((g) => g.cost))],
  ]);

  const at = (p: ParamKey, i: number) => normalized.get(p)?.[i] ?? 0;

  const scored = survivors.map((g, i) => {
    let score = 0;
    const parameter_scores: Partial<Record<ParamKey, number>> = {};
    for (const p of scoringParams) {
      const n = at(p, i);
      score += (weights.get(p) ?? 0) * n;
      parameter_scores[p] = Math.round(n * 100);
    }
    return {
      g,
      score: Math.round(clamp01(score) * 100),
      parameter_scores,
      bars: {
        strength: Math.round(at("UTS", i) * 100),
        corrosion: Math.round(at("corrosion", i) * 100),
        temp: Math.round(at("temperature", i) * 100),
      },
    };
  });


  // 7. One entry per base grade name — keep the highest scoring variant.
  const byBase = new Map<string, (typeof scored)[number]>();
  for (const s of scored) {
    const prev = byBase.get(s.g.baseGrade);
    if (!prev || s.score > prev.score) byBase.set(s.g.baseGrade, s);
  }

  // 8. Sort and take top 3.
  const top = [...byBase.values()].sort((a, b) => b.score - a.score).slice(0, 3);

  const toResponse = (s: (typeof scored)[number]): RecommendedGrade => ({
    name: s.g.baseGrade,
    common_name: s.g.name,
    type: s.g.type,
    final_score: s.score,
    strength_bar: s.bars.strength,
    corrosion_bar: s.bars.corrosion,
    toughness_bar: null, // data not available
    temp_bar: s.bars.temp,
    why_this_grade: WHY_PLACEHOLDER,
    trade_offs: [...TRADE_OFFS_PLACEHOLDER],
    details: {
      uts: s.g.uts,
      ys: s.g.ys,
      hardness: s.g.hardness,
      pren: Math.round(s.g.pren * 10) / 10,
      pren_index: s.g.prenIndex,
      min_service_temp: s.g.minServiceTemp,
      max_service_temp: s.g.maxServiceTemp,
      weldability_score: s.g.weldability,
      formability_score: s.g.formability,
      cost_score: s.g.cost,
      standard: s.g.standard,
      treatment: s.g.treatment,
      description: s.g.description,
    },
    parameter_scores: s.parameter_scores,
  });

  const [first, second] = top;
  if (!first) {
    return { error: "no_match", closest_grades: [], failed_on: active };
  }
  const separation = second ? first.score - second.score : 100;
  const confidence: RecommendSuccess["confidence"] = baseline
    ? "Baseline"
    : active.length >= 3 && separation > 10
      ? "High"
      : "Standard";

  return {
    recommended_grade: toResponse(first),
    alternatives: top.slice(1).map(toResponse),
    criteria_used: active,
    application: req.application,
    confidence,
  };
}
