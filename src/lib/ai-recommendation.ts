/**
 * AI Mode — separate material recommendation engine.
 *
 * Completely independent from Engineering Mode's scoring-engine.ts.
 * Does NOT use application columns, application weight profiles, or any
 * Engineering Mode logic. Uses the same stainless-steel database as the
 * source of truth for material properties.
 */

import rawGrades from "@/data/stainless-grades.json";

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type PrenIndex = "Low" | "Medium" | "High";

export interface CompositionRequirements {
  minChromium?: number;
  maxChromium?: number;
  minMolybdenum?: number;
  maxMolybdenum?: number;
  minNitrogen?: number;
  maxNitrogen?: number;
}

export interface AIRequirements {
  applicationContext?: string;
  environment?: string;
  minimumUTS?: number;
  minimumYieldStrength?: number;
  hardness?: number;
  operatingTemperature?: number;
  /** "low" | "medium" | "high" | "very-high" — mapped to PREN thresholds */
  corrosionRequirement?: string;
  formabilityRequirement?: string;
  weldabilityRequirement?: string;
  toughnessRequirement?: string;
  /** "budget" | "balanced" | "premium" */
  costPreference?: string;
  compositionRequirements?: CompositionRequirements;
  otherRequirements?: string;
}

export interface MaterialPropertyRecord {
  grade: string;
  name: string;
  type: string;
  standard: string;
  uts: number;
  yieldStrength: number;
  hardness: number;
  elongation: number;
  chromium: number;
  molybdenum: number;
  nitrogen: number;
  pren: number;
  prenIndex: PrenIndex;
  minServiceTemp: number;
  maxServiceTemp: number;
  weldability: number;
  formability: number;
  cost: number;
  treatment: string;
  description: string;
}

export interface AIGradeCandidate {
  grade: string;
  name: string;
  type: string;
  standard: string;
  uts: number;
  yieldStrength: number;
  hardness: number;
  elongation: number;
  chromium: number;
  molybdenum: number;
  nitrogen: number;
  pren: number;
  prenIndex: PrenIndex;
  minServiceTemp: number;
  maxServiceTemp: number;
  weldability: number;
  formability: number;
  cost: number;
  treatment: string;
  description: string;
  score: number;
  matchReasons: string[];
}

export interface AIRecommendationResult {
  candidates: AIGradeCandidate[];
  evaluatedRequirements: AIRequirements;
  hardRequirementsApplied: string[];
  softPreferencesApplied: string[];
  unevaluatedRequirements: string[];
  noMatchReason?: string;
  closestGrades?: { grade: string; type: string; failedHardRequirements: string[] }[];
}

/* ------------------------------------------------------------------ *
 * Preprocessing (once at load)
 * ------------------------------------------------------------------ */

const PREN_THRESHOLDS = { lowMax: 20, mediumMax: 30 };

function prenBucket(pren: number): PrenIndex {
  if (pren < PREN_THRESHOLDS.lowMax) return "Low";
  if (pren <= PREN_THRESHOLDS.mediumMax) return "Medium";
  return "High";
}

const PREN_RANK: Record<PrenIndex, number> = { Low: 1, Medium: 2, High: 3 };

function prenRequirementToRank(req: string): number | null {
  const r = req.toLowerCase().trim();
  if (r === "low") return PREN_RANK.Low;
  if (r === "medium") return PREN_RANK.Medium;
  if (r === "high") return PREN_RANK.High;
  if (r === "very-high" || r === "very high") return PREN_RANK.High;
  return null;
}

const HARDNESS_TOLERANCE = 0.15;

interface RawGrade {
  grade: string;
  name: string;
  type: string;
  standard: string;
  description: string;
  hardness: number;
  uts: number;
  ys: number;
  elongation: number;
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
  applications: string[];
}

/**
 * Sanitized material-property dataset — strips all application-specific columns.
 * This is the ONLY data exposed to AI Mode.
 */
export const MATERIAL_DATA: MaterialPropertyRecord[] = (rawGrades as RawGrade[]).map((g) => {
  const cr = (g.crMin + g.crMax) / 2;
  const mo = (g.moMin + g.moMax) / 2;
  const n = (g.nMin + g.nMax) / 2;
  const pren = cr + 3.3 * mo + 16 * n;
  return {
    grade: g.grade,
    name: g.name,
    type: g.type,
    standard: g.standard,
    uts: g.uts,
    yieldStrength: g.ys,
    hardness: g.hardness,
    elongation: g.elongation,
    chromium: Math.round(cr * 100) / 100,
    molybdenum: Math.round(mo * 100) / 100,
    nitrogen: Math.round(n * 10000) / 10000,
    pren: Math.round(pren * 10) / 10,
    prenIndex: prenBucket(pren),
    minServiceTemp: g.minServiceTemp,
    maxServiceTemp: g.maxServiceTemp,
    weldability: g.weldability,
    formability: g.formability,
    cost: g.cost,
    treatment: g.treatment,
    description: g.description,
  };
});

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 1);
  return values.map((v) => (v - min) / (max - min));
}

/* ------------------------------------------------------------------ *
 * Hard filter checks
 * ------------------------------------------------------------------ */

interface HardFilterResult {
  grade: MaterialPropertyRecord;
  failed: string[];
}

function checkHardRequirements(
  g: MaterialPropertyRecord,
  req: AIRequirements,
): string[] {
  const failed: string[] = [];

  if (req.minimumUTS != null && g.uts < req.minimumUTS) {
    failed.push(`Minimum UTS ${req.minimumUTS} MPa`);
  }

  if (req.minimumYieldStrength != null && g.yieldStrength < req.minimumYieldStrength) {
    failed.push(`Minimum yield strength ${req.minimumYieldStrength} MPa`);
  }

  if (req.operatingTemperature != null) {
    if (req.operatingTemperature < g.minServiceTemp || req.operatingTemperature > g.maxServiceTemp) {
      failed.push(`Operating temperature ${req.operatingTemperature}°C`);
    }
  }

  if (req.hardness != null) {
    const lo = req.hardness * (1 - HARDNESS_TOLERANCE);
    const hi = req.hardness * (1 + HARDNESS_TOLERANCE);
    if (g.hardness < lo || g.hardness > hi) {
      failed.push(`Brinell hardness ~${req.hardness} HB`);
    }
  }

  if (req.corrosionRequirement) {
    const requiredRank = prenRequirementToRank(req.corrosionRequirement);
    if (requiredRank != null && PREN_RANK[g.prenIndex] < requiredRank) {
      failed.push(`Corrosion resistance (${req.corrosionRequirement})`);
    }
  }

  const comp = req.compositionRequirements;
  if (comp) {
    if (comp.minChromium != null && g.chromium < comp.minChromium) {
      failed.push(`Minimum chromium ${comp.minChromium}%`);
    }
    if (comp.maxChromium != null && g.chromium > comp.maxChromium) {
      failed.push(`Maximum chromium ${comp.maxChromium}%`);
    }
    if (comp.minMolybdenum != null && g.molybdenum < comp.minMolybdenum) {
      failed.push(`Minimum molybdenum ${comp.minMolybdenum}%`);
    }
    if (comp.maxMolybdenum != null && g.molybdenum > comp.maxMolybdenum) {
      failed.push(`Maximum molybdenum ${comp.maxMolybdenum}%`);
    }
    if (comp.minNitrogen != null && g.nitrogen < comp.minNitrogen) {
      failed.push(`Minimum nitrogen ${comp.minNitrogen}%`);
    }
    if (comp.maxNitrogen != null && g.nitrogen > comp.maxNitrogen) {
      failed.push(`Maximum nitrogen ${comp.maxNitrogen}%`);
    }
  }

  return failed;
}

/* ------------------------------------------------------------------ *
 * Soft preference scoring
 * ------------------------------------------------------------------ */

interface SoftPreference {
  key: string;
  weight: number;
  values: number[];
  /** true = higher is better, false = lower is better */
  higherIsBetter: boolean;
}

function buildSoftPreferences(
  survivors: MaterialPropertyRecord[],
  req: AIRequirements,
): SoftPreference[] {
  const prefs: SoftPreference[] = [];

  // Strength preference (UTS + yield)
  if (req.minimumUTS != null || req.minimumYieldStrength != null) {
    prefs.push({
      key: "strength",
      weight: 1.0,
      values: survivors.map((g) => (g.uts + g.yieldStrength) / 2),
      higherIsBetter: true,
    });
  }

  // Corrosion (PREN)
  if (req.corrosionRequirement) {
    prefs.push({
      key: "corrosion",
      weight: 1.0,
      values: survivors.map((g) => g.pren),
      higherIsBetter: true,
    });
  }

  // Cost preference
  if (req.costPreference) {
    const cp = req.costPreference.toLowerCase();
    // cost score in DB: higher = more affordable
    prefs.push({
      key: "cost",
      weight: cp === "budget" ? 1.5 : cp === "premium" ? 0.3 : 0.8,
      values: survivors.map((g) => g.cost),
      higherIsBetter: true,
    });
  }

  // Formability
  if (req.formabilityRequirement) {
    const fr = req.formabilityRequirement.toLowerCase();
    const weight = fr === "high" || fr === "very-high" ? 1.2 : fr === "medium" ? 0.6 : 0.3;
    prefs.push({
      key: "formability",
      weight,
      values: survivors.map((g) => g.formability),
      higherIsBetter: true,
    });
  }

  // Weldability
  if (req.weldabilityRequirement) {
    const wr = req.weldabilityRequirement.toLowerCase();
    const weight = wr === "high" || wr === "very-high" ? 1.2 : wr === "medium" ? 0.6 : 0.3;
    prefs.push({
      key: "weldability",
      weight,
      values: survivors.map((g) => g.weldability),
      higherIsBetter: true,
    });
  }

  // Temperature suitability
  if (req.operatingTemperature != null) {
    prefs.push({
      key: "temperature",
      weight: 1.0,
      values: survivors.map((g) => {
        const span = g.maxServiceTemp - g.minServiceTemp;
        if (span <= 0) return 0;
        const lo = req.operatingTemperature!;
        const lowerMargin = lo - g.minServiceTemp;
        const upperMargin = g.maxServiceTemp - lo;
        if (lowerMargin < 0 || upperMargin < 0) return 0;
        return clamp01((lowerMargin + upperMargin) / span);
      }),
      higherIsBetter: true,
    });
  }

  // Hardness closeness
  if (req.hardness != null) {
    const target = req.hardness;
    const range = Math.max(...survivors.map((g) => g.hardness)) - Math.min(...survivors.map((g) => g.hardness));
    prefs.push({
      key: "hardness",
      weight: 0.8,
      values: survivors.map((g) => {
        const diff = Math.abs(g.hardness - target);
        return range > 0 ? clamp01(1 - diff / range) : 1;
      }),
      higherIsBetter: true,
    });
  }

  // Toughness — approximated by elongation (higher elongation ~ better toughness)
  if (req.toughnessRequirement) {
    prefs.push({
      key: "toughness",
      weight: 0.8,
      values: survivors.map((g) => g.elongation),
      higherIsBetter: true,
    });
  }

  return prefs;
}

/* ------------------------------------------------------------------ *
 * Main entry point
 * ------------------------------------------------------------------ */

export function aiRecommend(req: AIRequirements): AIRecommendationResult {
  const hardRequirementsApplied: string[] = [];
  const softPreferencesApplied: string[] = [];
  const unevaluatedRequirements: string[] = [];

  // Determine which hard requirements are active
  if (req.minimumUTS != null) hardRequirementsApplied.push(`Minimum UTS: ${req.minimumUTS} MPa`);
  if (req.minimumYieldStrength != null) hardRequirementsApplied.push(`Minimum yield strength: ${req.minimumYieldStrength} MPa`);
  if (req.operatingTemperature != null) hardRequirementsApplied.push(`Operating temperature: ${req.operatingTemperature}°C`);
  if (req.hardness != null) hardRequirementsApplied.push(`Brinell hardness: ~${req.hardness} HB`);
  if (req.corrosionRequirement) hardRequirementsApplied.push(`Corrosion resistance: ${req.corrosionRequirement}`);
  if (req.compositionRequirements) {
    const comp = req.compositionRequirements;
    if (comp.minChromium != null) hardRequirementsApplied.push(`Min chromium: ${comp.minChromium}%`);
    if (comp.maxChromium != null) hardRequirementsApplied.push(`Max chromium: ${comp.maxChromium}%`);
    if (comp.minMolybdenum != null) hardRequirementsApplied.push(`Min molybdenum: ${comp.minMolybdenum}%`);
    if (comp.maxMolybdenum != null) hardRequirementsApplied.push(`Max molybdenum: ${comp.maxMolybdenum}%`);
    if (comp.minNitrogen != null) hardRequirementsApplied.push(`Min nitrogen: ${comp.minNitrogen}%`);
    if (comp.maxNitrogen != null) hardRequirementsApplied.push(`Max nitrogen: ${comp.maxNitrogen}%`);
  }

  // Determine soft preferences
  if (req.costPreference) softPreferencesApplied.push(`Cost preference: ${req.costPreference}`);
  if (req.formabilityRequirement) softPreferencesApplied.push(`Formability: ${req.formabilityRequirement}`);
  if (req.weldabilityRequirement) softPreferencesApplied.push(`Weldability: ${req.weldabilityRequirement}`);
  if (req.toughnessRequirement) softPreferencesApplied.push(`Toughness: ${req.toughnessRequirement}`);

  // Track unevaluated requirements (contextual only, no DB support)
  if (req.applicationContext && !hardRequirementsApplied.length && !softPreferencesApplied.length) {
    unevaluatedRequirements.push(`Application context "${req.applicationContext}" — noted but no filterable property extracted`);
  }
  if (req.environment && !req.corrosionRequirement && !req.operatingTemperature) {
    unevaluatedRequirements.push(`Environment "${req.environment}" — no specific corrosion or temperature requirement extracted`);
  }
  if (req.otherRequirements) {
    unevaluatedRequirements.push(`Other requirements: "${req.otherRequirements}"`);
  }

  // Step 1: Hard filter
  const hasHardReqs = hardRequirementsApplied.length > 0;
  let survivors: MaterialPropertyRecord[];
  let closestGrades: { grade: string; type: string; failedHardRequirements: string[] }[] | undefined;

  if (hasHardReqs) {
    const results: HardFilterResult[] = MATERIAL_DATA.map((g) => ({
      grade: g,
      failed: checkHardRequirements(g, req),
    }));

    survivors = results.filter((r) => r.failed.length === 0).map((r) => r.grade);

    if (survivors.length === 0) {
      // Collect closest grades (fewest failures)
      closestGrades = [...results]
        .sort((a, b) => a.failed.length - b.failed.length)
        .slice(0, 5)
        .map((r) => ({
          grade: r.grade.grade,
          type: r.grade.type,
          failedHardRequirements: r.failed,
        }));

      return {
        candidates: [],
        evaluatedRequirements: req,
        hardRequirementsApplied,
        softPreferencesApplied,
        unevaluatedRequirements,
        noMatchReason: "No grade in the current database satisfies all stated hard requirements.",
        closestGrades,
      };
    }
  } else {
    survivors = [...MATERIAL_DATA];
  }

  // Step 2: Soft preference scoring
  const prefs = buildSoftPreferences(survivors, req);

  // If no soft prefs at all, use a balanced default profile
  const effectivePrefs =
    prefs.length > 0
      ? prefs
      : [
          { key: "strength", weight: 0.2, values: survivors.map((g) => (g.uts + g.yieldStrength) / 2), higherIsBetter: true },
          { key: "corrosion", weight: 0.2, values: survivors.map((g) => g.pren), higherIsBetter: true },
          { key: "weldability", weight: 0.2, values: survivors.map((g) => g.weldability), higherIsBetter: true },
          { key: "formability", weight: 0.2, values: survivors.map((g) => g.formability), higherIsBetter: true },
          { key: "cost", weight: 0.2, values: survivors.map((g) => g.cost), higherIsBetter: true },
        ];

  const normalizedPrefs = effectivePrefs.map((p) => ({
    ...p,
    normalized: p.higherIsBetter ? normalize(p.values) : normalize(p.values).map((v) => 1 - v),
  }));

  const totalWeight = normalizedPrefs.reduce((sum, p) => sum + p.weight, 0);

  const scored = survivors.map((g, i) => {
    let score = 0;
    const matchReasons: string[] = [];
    for (const p of normalizedPrefs) {
      const n = p.normalized[i] ?? 0;
      score += (p.weight / totalWeight) * n;
      if (n > 0.7) {
        matchReasons.push(`Strong ${p.key} match`);
      }
    }
    return { grade: g, score: Math.round(clamp01(score) * 100), matchReasons };
  });

  // Step 3: Deduplicate by base grade name (strip parentheses), keep highest
  const byBase = new Map<string, (typeof scored)[number]>();
  for (const s of scored) {
    const base = s.grade.grade.replace(/\s*\([^)]*\)/g, "").trim();
    const prev = byBase.get(base);
    if (!prev || s.score > prev.score) byBase.set(base, s);
  }

  // Step 4: Sort and take top 5
  const top = [...byBase.values()].sort((a, b) => b.score - a.score).slice(0, 5);

  const candidates: AIGradeCandidate[] = top.map((s) => ({
    grade: s.grade.grade,
    name: s.grade.name,
    type: s.grade.type,
    standard: s.grade.standard,
    uts: s.grade.uts,
    yieldStrength: s.grade.yieldStrength,
    hardness: s.grade.hardness,
    elongation: s.grade.elongation,
    chromium: s.grade.chromium,
    molybdenum: s.grade.molybdenum,
    nitrogen: s.grade.nitrogen,
    pren: s.grade.pren,
    prenIndex: s.grade.prenIndex,
    minServiceTemp: s.grade.minServiceTemp,
    maxServiceTemp: s.grade.maxServiceTemp,
    weldability: s.grade.weldability,
    formability: s.grade.formability,
    cost: s.grade.cost,
    treatment: s.grade.treatment,
    description: s.grade.description,
    score: s.score,
    matchReasons: s.matchReasons,
  }));

  return {
    candidates,
    evaluatedRequirements: req,
    hardRequirementsApplied,
    softPreferencesApplied,
    unevaluatedRequirements,
  };
}

/**
 * Check if a specific grade name exists in the database.
 * Used to answer "do you have grade X?" type questions.
 */
export function findGradeByName(query: string): MaterialPropertyRecord | null {
  const q = query.toLowerCase().trim();
  return MATERIAL_DATA.find(
    (g) =>
      g.grade.toLowerCase().includes(q) ||
      g.name.toLowerCase().includes(q),
  ) ?? null;
}

/**
 * Return all grade names for context (used to tell Gemini what's available).
 */
export function getAllGradeNames(): string[] {
  return MATERIAL_DATA.map((g) => g.grade);
}
