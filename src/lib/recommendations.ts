/**
 * Recommendation data layer.
 *
 * `getRecommendations` is the single seam between the UI and the (future)
 * backend recommendation engine. Today it returns mock data; later it can be
 * swapped for an API call without touching any component.
 */

export type Application = "construction" | "consumer-products" | "shipbuilding" | "railways" | "other";
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
  { value: "machine-parts", label: "Machine Parts" },
  { value: "shipbuilding", label: "Shipbuilding" },
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
  scores: Record<ScoreKey, number>;
  whyRecommended: string;
  tradeoffs: Tradeoff[];
  applications: string[];
  properties: { label: string; value: string }[];
}

export interface RecommendationResult {
  recommendations: GradeRecommendation[];
  /** Optional parameters the user asked us to weigh in. */
  consideredOptional: OptionalScoreKey[];
}

const MOCK_GRADES: GradeRecommendation[] = [
  {
    grade: "SS 304",
    family: "Austenitic (18/8 chromium-nickel)",
    overallScore: 92,
    scores: {
      strength: 78,
      corrosionResistance: 88,
      impactToughness: 90,
      temperatureSuitability: 86,
      weldability: 93,
      formability: 95,
      cost: 74,
    },
    whyRecommended:
      "Strong overall fit for construction applications with excellent corrosion resistance and good formability, while remaining widely available in standard sections and sheet.",
    tradeoffs: [
      { type: "positive", text: "Excellent corrosion resistance in atmospheric service" },
      { type: "positive", text: "Good formability and straightforward welding" },
      { type: "caution", text: "Higher cost than SS 410" },
      { type: "caution", text: "Lower yield strength than martensitic grades" },
    ],
    applications: [
      "Structural cladding and architectural trim",
      "Food and beverage equipment",
      "General fabrication and tanks",
      "Kitchen and sanitary fittings",
    ],
    properties: [
      { label: "Typical UTS", value: "515 – 620 MPa" },
      { label: "Yield strength (0.2%)", value: "≥ 205 MPa" },
      { label: "Impact toughness", value: "≈ 120 J at -40 °C" },
      { label: "Service temperature", value: "-196 °C to 870 °C" },
      { label: "Magnetic response", value: "Non-magnetic (annealed)" },
    ],
  },
  {
    grade: "SS 316L",
    family: "Austenitic (molybdenum-bearing, low carbon)",
    overallScore: 88,
    scores: {
      strength: 76,
      corrosionResistance: 96,
      impactToughness: 91,
      temperatureSuitability: 88,
      weldability: 96,
      formability: 90,
      cost: 58,
    },
    whyRecommended:
      "Best choice where chloride exposure or marine conditions are expected — the molybdenum addition markedly improves pitting resistance, and the low-carbon chemistry avoids weld sensitisation.",
    tradeoffs: [
      { type: "positive", text: "Superior pitting and crevice corrosion resistance" },
      { type: "positive", text: "Excellent weldability with no post-weld annealing needed" },
      { type: "caution", text: "Noticeably more expensive than SS 304" },
      { type: "caution", text: "Similar strength to 304, so no structural gain" },
    ],
    applications: [
      "Marine and offshore hardware",
      "Chemical and pharmaceutical process equipment",
      "Coastal architectural fixings",
      "Heat exchangers and pressure vessels",
    ],
    properties: [
      { label: "Typical UTS", value: "485 – 620 MPa" },
      { label: "Yield strength (0.2%)", value: "≥ 170 MPa" },
      { label: "Impact toughness", value: "≈ 130 J at -40 °C" },
      { label: "Service temperature", value: "-196 °C to 800 °C" },
      { label: "PREN", value: "≈ 24 – 26" },
    ],
  },
  {
    grade: "SS 410",
    family: "Martensitic (hardenable 12% chromium)",
    overallScore: 74,
    scores: {
      strength: 94,
      corrosionResistance: 55,
      impactToughness: 62,
      temperatureSuitability: 70,
      weldability: 52,
      formability: 48,
      cost: 92,
    },
    whyRecommended:
      "The economical high-strength option: heat treatable to substantially higher tensile and hardness levels, suited to wear-facing machine parts in mild environments.",
    tradeoffs: [
      { type: "positive", text: "Highest strength and hardness of the three grades" },
      { type: "positive", text: "Lowest material cost" },
      { type: "caution", text: "Limited corrosion resistance — not for marine service" },
      { type: "caution", text: "Requires pre-heat and post-weld treatment when welded" },
    ],
    applications: [
      "Shafts, fasteners and pump components",
      "Valve trim and wear parts",
      "Cutlery and hand tools",
      "Steam and gas turbine parts",
    ],
    properties: [
      { label: "Typical UTS", value: "620 – 830 MPa (hardened)" },
      { label: "Yield strength (0.2%)", value: "≥ 275 MPa" },
      { label: "Impact toughness", value: "≈ 40 J at room temperature" },
      { label: "Service temperature", value: "-30 °C to 650 °C" },
      { label: "Magnetic response", value: "Magnetic" },
    ],
  },
];

/**
 * Returns ranked grade recommendations for a set of user requirements.
 *
 * MOCK IMPLEMENTATION — replace the body with a backend call. The signature
 * and return shape are the contract the UI depends on.
 */
export async function getRecommendations(
  requirements: UserRequirements,
): Promise<RecommendationResult> {
  await new Promise((resolve) => setTimeout(resolve, 1400));

  const consideredOptional: OptionalScoreKey[] = [
    ...(requirements.considerWeldability ? (["weldability"] as const) : []),
    ...(requirements.considerFormability ? (["formability"] as const) : []),
    ...(requirements.considerCost ? (["cost"] as const) : []),
  ];

  return {
    recommendations: [...MOCK_GRADES].sort((a, b) => b.overallScore - a.overallScore),
    consideredOptional,
  };
}
