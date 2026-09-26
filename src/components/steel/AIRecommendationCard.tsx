import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Types — mirror the server response shape
 * ------------------------------------------------------------------ */

interface MaterialProperties {
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
  prenIndex: "Low" | "Medium" | "High";
  minServiceTemp: number;
  maxServiceTemp: number;
  weldability: number;
  formability: number;
  cost: number;
  treatment: string;
  description: string;
}

export interface AIValidatedGrade {
  grade: string;
  reason: string;
  properties: MaterialProperties;
}

/* ------------------------------------------------------------------ *
 * Label helpers
 * ------------------------------------------------------------------ */

function scoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Moderate";
  if (score >= 20) return "Low";
  return "Very Low";
}

function costLabel(cost: number): string {
  if (cost >= 60) return "Budget-friendly";
  if (cost >= 40) return "Moderate cost";
  if (cost >= 20) return "Higher cost";
  return "Premium cost";
}

function corrosionLabel(prenIndex: string): string {
  if (prenIndex === "High") return "High";
  if (prenIndex === "Medium") return "Moderate";
  return "Low";
}

function strengthLabel(uts: number): string {
  if (uts >= 700) return "Very High";
  if (uts >= 550) return "High";
  if (uts >= 400) return "Moderate";
  return "Low";
}

/** Strip the manufacturing-condition suffix from the grade title. */
function cleanGradeName(grade: string): {
  base: string;
  condition: string | null;
} {
  const match = grade.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (match) {
    const condition = match[2].replace(/_/g, " ").trim();
    // Skip non-condition parentheticals like UNS designations
    if (/^(hot|cold|annealed|tempered|quenched)/i.test(condition)) {
      return { base: match[1].trim(), condition };
    }
  }
  return { base: grade, condition: null };
}

/* ------------------------------------------------------------------ *
 * Property row with optional tooltip
 * ------------------------------------------------------------------ */

function PropertyRow({
  label,
  value,
  tooltip,
  unavailable,
}: {
  label: string;
  value: string;
  tooltip?: string;
  unavailable?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1">
      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {label}
        {tooltip ? (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3 cursor-help text-muted-foreground/50 hover:text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px] text-left leading-relaxed">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </span>
      <span
        className={cn(
          "text-xs font-semibold tabular-nums",
          unavailable ? "italic font-normal text-muted-foreground/60" : "text-foreground",
        )}
      >
        {unavailable ? "Data not available" : value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Main card
 * ------------------------------------------------------------------ */

export function AIRecommendationCard({
  grade,
  rank,
}: {
  grade: AIValidatedGrade;
  rank: number;
}) {
  const p = grade.properties;
  const { base, condition } = cleanGradeName(p.grade);
  const isBest = rank === 0;

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-5 transition-all",
        isBest
          ? "border-primary/60 shadow-[var(--shadow-elevated)] ring-1 ring-primary/15"
          : "border-border shadow-[var(--shadow-card)]",
      )}
    >
      {isBest ? (
        <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-foreground">
          <Award className="size-3" />
          Top Recommendation
        </span>
      ) : (
        <span className="absolute -top-3 left-5 rounded-full bg-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Option {rank + 1}
        </span>
      )}

      {/* Header */}
      <div className="pt-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-display text-lg font-bold leading-tight text-foreground">
              {base}
            </h4>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">
                {p.type}
              </Badge>
              {condition ? (
                <Badge variant="outline" className="text-[10px] font-medium">
                  {condition}
                </Badge>
              ) : null}
              {p.standard ? (
                <span className="text-[10px] text-muted-foreground">{p.standard}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Why it fits */}
      <div className="mt-4 rounded-xl border border-primary/15 bg-primary-soft p-3.5">
        <h5 className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
          Why it fits
        </h5>
        <p className="text-sm leading-relaxed text-foreground">{grade.reason}</p>
      </div>

      {/* Key properties */}
      <div className="mt-4">
        <h5 className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Key Properties
        </h5>
        <div className="divide-y divide-border/50">
          <PropertyRow
            label="Corrosion Resistance"
            value={corrosionLabel(p.prenIndex)}
            tooltip="Resistance to localized corrosion (pitting). Based on PREN — Pitting Resistance Equivalent Number."
          />
          <PropertyRow
            label="PREN"
            value={p.pren.toFixed(1)}
            tooltip="Pitting Resistance Equivalent Number (Cr + 3.3×Mo + 16×N). Higher = better pitting resistance."
          />
          <PropertyRow
            label="Strength"
            value={`${strengthLabel(p.uts)} · ${p.uts} MPa`}
            tooltip="Ultimate Tensile Strength (UTS) — maximum stress the material withstands before breaking."
          />
          <PropertyRow
            label="Yield Strength"
            value={p.yieldStrength ? `${p.yieldStrength} MPa` : ""}
            unavailable={!p.yieldStrength}
            tooltip="Stress at which the material begins to deform permanently."
          />
          <PropertyRow
            label="Weldability"
            value={scoreLabel(p.weldability)}
            tooltip="How easily the grade can be welded without defects."
          />
          <PropertyRow
            label="Formability"
            value={scoreLabel(p.formability)}
            tooltip="How easily the grade can be bent, drawn, or shaped."
          />
          <PropertyRow
            label="Temperature Range"
            value={
              p.maxServiceTemp > -300
                ? `${p.minServiceTemp}°C to ${p.maxServiceTemp}°C`
                : ""
            }
            unavailable={p.maxServiceTemp <= -300}
            tooltip="Recommended service temperature range for this grade."
          />
          <PropertyRow
            label="Cost"
            value={costLabel(p.cost)}
            tooltip="Relative material cost. Lower score = more expensive."
          />
        </div>
      </div>

      {/* Trade-offs */}
      <div className="mt-4">
        <h5 className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Trade-offs
        </h5>
        <ul className="space-y-1.5">
          {p.cost < 25 ? (
            <li className="flex gap-2 text-xs">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
              <span className="text-muted-foreground">
                {costLabel(p.cost)} compared to other grades in this recommendation.
              </span>
            </li>
          ) : (
            <li className="flex gap-2 text-xs">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
              <span className="text-muted-foreground">
                {costLabel(p.cost)} — a good balance of performance and value.
              </span>
            </li>
          )}
          {p.weldability >= 80 ? (
            <li className="flex gap-2 text-xs">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
              <span className="text-muted-foreground">
                Excellent weldability — well suited for fabricated structures.
              </span>
            </li>
          ) : p.weldability < 60 ? (
            <li className="flex gap-2 text-xs">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
              <span className="text-muted-foreground">
                Weldability is {scoreLabel(p.weldability).toLowerCase()} — may require special welding procedures.
              </span>
            </li>
          ) : null}
          {p.prenIndex === "High" ? (
            <li className="flex gap-2 text-xs">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
              <span className="text-muted-foreground">
                High corrosion resistance suitable for aggressive environments.
              </span>
            </li>
          ) : p.prenIndex === "Low" ? (
            <li className="flex gap-2 text-xs">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
              <span className="text-muted-foreground">
                Lower corrosion resistance — best for mild or indoor environments.
              </span>
            </li>
          ) : null}
        </ul>
      </div>
    </article>
  );
}
