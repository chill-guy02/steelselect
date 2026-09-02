import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  APPLICATION_OPTIONS,
  CORROSION_OPTIONS,
  SCORE_LABELS,
  type GradeRecommendation,
  type RecommendationResult,
  type UserRequirements,
} from "@/lib/recommendations";
import { GradeCard } from "./GradeCard";
import { ComparisonTable } from "./ComparisonTable";
import { GradeDetailsDialog } from "./GradeDetailsDialog";

function summarize(req: UserRequirements) {
  const items: { label: string; value: string }[] = [];
  const app = APPLICATION_OPTIONS.find((o) => o.value === req.application);
  if (app) items.push({ label: "Application", value: app.label });
  if (req.minimumUTS !== null)
    items.push({ label: "Minimum UTS", value: `${req.minimumUTS} MPa` });
  const cor = CORROSION_OPTIONS.find((o) => o.value === req.corrosionResistance);
  if (cor) items.push({ label: "Corrosion Resistance", value: cor.label });
  if (req.impactToughness !== null)
    items.push({ label: "Impact Toughness", value: `${req.impactToughness} J` });
  if (req.operatingTemperatureMin !== null)
    items.push({ label: "Min. Temperature", value: `${req.operatingTemperatureMin} °C` });
  if (req.operatingTemperatureMax !== null)
    items.push({ label: "Max. Temperature", value: `${req.operatingTemperatureMax} °C` });
  return items;
}

export function ResultsView({
  requirements,
  result,
  onEdit,
}: {
  requirements: UserRequirements;
  result: RecommendationResult;
  onEdit: () => void;
}) {
  const [detail, setDetail] = useState<GradeRecommendation | null>(null);
  const summary = summarize(requirements);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          Recommended Stainless Steel Grades
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Based on your selected requirements, these grades offer the best overall fit.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Your requirements
            </h2>
            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              {summary.map((s) => (
                <div key={s.label}>
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </dt>
                  <dd className="text-sm font-semibold text-foreground">{s.value}</dd>
                </div>
              ))}
              {result.consideredOptional.length > 0 ? (
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Also considering
                  </dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {result.consideredOptional.map((k) => SCORE_LABELS[k]).join(", ")}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
          <Button variant="subtle" onClick={onEdit}>
            <ArrowLeft />
            Edit Requirements
          </Button>
        </div>
      </section>

      {result.error ? (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="font-display text-lg font-bold text-destructive">{result.error}</h2>
          {result.failedOn?.length ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Most restrictive criteria: {result.failedOn.join(", ")}. Try relaxing these values.
            </p>
          ) : null}
        </section>
      ) : (
        <>
          {result.confidence ? (
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Confidence:{" "}
              <span className="font-semibold text-primary">{result.confidence}</span>
            </p>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-3">
            {result.recommendations.map((rec, i) => (
              <GradeCard
                key={rec.grade}
                rec={rec}
                best={i === 0}
                consideredOptional={result.consideredOptional}
                onViewDetails={() => setDetail(rec)}
              />
            ))}
          </div>

          <section>
            <h2 className="mb-4 font-display text-xl font-bold text-foreground">
              Side-by-side comparison
            </h2>
            <ComparisonTable
              recommendations={result.recommendations}
              consideredOptional={result.consideredOptional}
            />
          </section>
        </>
      )}

      <GradeDetailsDialog
        grade={detail}
        open={detail !== null}
        onOpenChange={(v) => !v && setDetail(null)}
      />
    </div>
  );
}
