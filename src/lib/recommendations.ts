/**
 * Recommendation data layer.
 *
 * Single seam between the UI and the scoring engine. `getRecommendations`
 * calls the `recommendGrades` server function, which runs the real engine over
 * the stainless-steel database (no mock data).
 */

import { recommendGrades } from "./recommend.functions";
import type { PrenIndex, RecommendResponse, RecommendedGrade } from "./scoring-engine";

export type Application = "construction" | "consumer-products" | "shipbuilding" | "railways" | "automobiles" | "other";
export type CorrosionResistance = "low" | "medium" | "high" | "very-high";


export interface UserRequirements {
  application: Application | null;
  minimumUTS: number | null;
  corrosionResistance: CorrosionResistance | null;
  impactToughness: number | null;
  operatingTemperatureMin: number | null;
  operatingTemperatureMax: number | null;
  considerWeldability: boolean;
  considerFormability: boolean;
  considerCost: boolean;
}

export const emptyRequirements: UserRequirements = {
  application: null,
  minimumUTS: null,
  corrosionResistance: null,
  impactToughness: null,
  operatingTemperatureMin: null,
  operatingTemperatureMax: null,
  considerWeldability: false,
  considerFormability: false,
  considerCost: false,
};

export const APPLICATION_OPTIONS: { value: Application; label: string }[] = [
  { value: "construction", label: "Construction" },
  { value: "consumer-products", label: "Consumer Products" },
  { value: "shipbuilding", label: "Shipbuilding" },
  { value: "railways", label: "Railways" },
  { value: "automobiles", label: "Automobiles" },
  { value: "other", label: "Other" },
];

export const CORROSION_OPTIONS: { value: CorrosionResistance; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "very-high", label: "Very High" },
];

export type CoreScoreKey =
  | "strength"
  | "corrosionResistance"
  | "impactToughness"
  | "temperatureSuitability";

export type OptionalScoreKey = "weldability" | "formability" | "cost";
export type ScoreKey = CoreScoreKey | OptionalScoreKey;

export const CORE_SCORE_KEYS: CoreScoreKey[] = [
  "strength",
  "corrosionResistance",
  "impactToughness",
  "temperatureSuitability",
];

export const OPTIONAL_SCORE_KEYS: OptionalScoreKey[] = ["weldability", "formability", "cost"];

export const SCORE_LABELS: Record<ScoreKey, string> = {
  strength: "Strength",
  corrosionResistance: "Corrosion Resistance",
  impactToughness: "Impact Toughness",
  temperatureSuitability: "Temperature Suitability",
  weldability: "Weldability",
  formability: "Formability",
  cost: "Cost",
};

export interface Tradeoff {
  type: "positive" | "caution";
  text: string;
}

export interface GradeRecommendation {
  grade: string;
  family: string;
  overallScore: number;
  /** null => data not available for that parameter (e.g. toughness). */
  scores: Record<ScoreKey, number | null>;
  whyRecommended: string;
  tradeoffs: Tradeoff[];
  applications: string[];
  properties: { label: string; value: string }[];
}

export interface RecommendationResult {
  recommendations: GradeRecommendation[];
  /** Optional parameters the user asked us to weigh in. */
  consideredOptional: OptionalScoreKey[];
  confidence?: "Baseline" | "Standard" | "High";
  /** Set when the hard filters eliminated every grade. */
  error?: string;
  failedOn?: string[];
}

/** UI application values -> engine weight-profile keys. */
const APPLICATION_PROFILE: Record<Application, string> = {
  construction: "Construction",
  shipbuilding: "Shipbuilding",
  automobiles: "Automotive / Mobility",
  railways: "Railways",
  "consumer-products": "Consumer Products",
  other: "Construction",
};

/** UI application values -> database application columns used as a pre-filter. */
const APPLICATION_COLUMN: Record<Application, string> = {
  construction: "Construction",
  shipbuilding: "Shipbuilding",
  automobiles: "Automobiles",
  railways: "Railways",
  "consumer-products": "Consumer_Products",
  other: "Others",
};

const CORROSION_TO_PREN: Record<CorrosionResistance, PrenIndex> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  "very-high": "High",
};

const PARAM_LABELS: Record<string, string> = {
  UTS: "Minimum UTS",
  corrosion: "Corrosion resistance",
  hardness: "Brinell hardness",
  temperature: "Service temperature",
  weldability: "Weldability",
  formability: "Formability",
  cost: "Cost",
};

function toGrade(g: RecommendedGrade): GradeRecommendation {
  const d = g.details;
  return {
    grade: g.name,
    family: [g.type, g.common_name].filter(Boolean).join(" — "),
    overallScore: g.final_score,
    scores: {
      strength: g.strength_bar,
      corrosionResistance: g.corrosion_bar,
      impactToughness: g.toughness_bar,
      temperatureSuitability: g.temp_bar,
      weldability: g.parameter_scores.weldability ?? d.weldability_score,
      formability: g.parameter_scores.formability ?? d.formability_score,
      cost: g.parameter_scores.cost ?? d.cost_score,
    },
    whyRecommended: g.why_this_grade,
    tradeoffs: g.trade_offs.map((text) => ({ type: "positive" as const, text })),
    applications: d.description ? [d.description] : [],
    properties: [
      { label: "Ultimate tensile strength", value: `${d.uts} MPa` },
      { label: "Yield strength", value: `${d.ys} MPa` },
      { label: "Brinell hardness", value: `${d.hardness} HB` },
      { label: "PREN", value: `${d.pren} (${d.pren_index})` },
      {
        label: "Service temperature",
        value: `${d.min_service_temp} °C to ${d.max_service_temp} °C`,
      },
      { label: "Weldability score", value: `${d.weldability_score} / 100` },
      { label: "Formability score", value: `${d.formability_score} / 100` },
      { label: "Cost score", value: `${d.cost_score} / 100` },
      { label: "Standard", value: d.standard || "—" },
      { label: "Condition / treatment", value: d.treatment || "—" },
    ],
  };
}

/**
 * Returns ranked grade recommendations for a set of user requirements by
 * calling the scoring engine over the stainless-steel database.
 */
export async function getRecommendations(
  requirements: UserRequirements,
): Promise<RecommendationResult> {
  const consideredOptional: OptionalScoreKey[] = [
    ...(requirements.considerWeldability ? (["weldability"] as const) : []),
    ...(requirements.considerFormability ? (["formability"] as const) : []),
    ...(requirements.considerCost ? (["cost"] as const) : []),
  ];

  const application = APPLICATION_PROFILE[requirements.application ?? "other"];

  const response: RecommendResponse = await recommendGrades({
    data: {
      application,
      app_column: APPLICATION_COLUMN[requirements.application ?? "other"],
      uts: requirements.minimumUTS,
      corrosion: requirements.corrosionResistance
        ? CORROSION_TO_PREN[requirements.corrosionResistance]
        : null,
      // The "Brinell hardness" field in the form is stored on this key.
      hardness: requirements.impactToughness,
      min_temp: requirements.operatingTemperatureMin,
      max_temp: requirements.operatingTemperatureMax,
      weldability_required: requirements.considerWeldability,
      formability_required: requirements.considerFormability,
      cost_required: requirements.considerCost,
    },
  });

  if ("error" in response) {
    return {
      recommendations: [],
      consideredOptional,
      error: "No grade in the database satisfies every requirement.",
      failedOn: response.failed_on.map((k) => PARAM_LABELS[k] ?? k),
    };
  }

  return {
    recommendations: [response.recommended_grade, ...response.alternatives].map(toGrade),
    consideredOptional,
    confidence: response.confidence,
  };
}

