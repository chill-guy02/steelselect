import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CORE_SCORE_KEYS,
  SCORE_LABELS,
  type GradeRecommendation,
  type OptionalScoreKey,
} from "@/lib/recommendations";
import { ScoreBar, ScoreDial } from "./ScoreBar";

export function GradeCard({
  rec,
  best,
  consideredOptional,
  onViewDetails,
}: {
  rec: GradeRecommendation;
  best: boolean;
  consideredOptional: OptionalScoreKey[];
  onViewDetails: () => void;
}) {
  return (
    <article
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5",
        best
          ? "border-primary/60 shadow-[var(--shadow-elevated)] ring-1 ring-primary/15"
          : "border-border shadow-[var(--shadow-card)] hover:border-primary/30",
      )}
    >
      {best ? (
        <span className="absolute -top-3 left-5 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-foreground">
          Best Match
        </span>
      ) : null}

      <div className="flex items-center justify-between gap-4 pt-2">
        <div>
          <h3 className="font-display text-xl font-bold text-foreground">{rec.grade}</h3>
          <p className="text-xs text-muted-foreground">{rec.family}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Overall Score{" "}
            <span className="font-display text-sm font-bold text-primary">
              {rec.overallScore} / 100
            </span>
          </p>
        </div>
        <ScoreDial score={rec.overallScore} />
      </div>

      <div className="mt-5 space-y-3.5 border-t border-border pt-5">
        {CORE_SCORE_KEYS.map((k) => (
          <ScoreBar key={k} label={SCORE_LABELS[k]} score={rec.scores[k]} />
        ))}
        {consideredOptional.map((k) => (
          <ScoreBar key={k} label={SCORE_LABELS[k]} score={rec.scores[k]} />
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-primary/15 bg-primary-soft p-4">
        <h4 className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
          Why this grade?
        </h4>
        <p className="text-sm leading-relaxed text-foreground">{rec.whyRecommended}</p>
      </div>

      <div className="mt-4">
        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Key Trade-offs
        </h4>
        <ul className="space-y-1.5">
          {rec.tradeoffs.map((t) => (
            <li key={t.text} className="flex gap-2 text-sm">
              <span className={t.type === "positive" ? "text-success" : "text-warning"}>
                {t.type === "positive" ? "✓" : "⚠"}
              </span>
              <span className="text-muted-foreground">{t.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button variant="subtle" className="mt-5 w-full" onClick={onViewDetails}>
        View Grade Details
      </Button>
    </article>
  );
}
