import { cn } from "@/lib/utils";

export function ScoreBar({
  label,
  score,
  className,
}: {
  label: string;
  score: number | null;
  className?: string;
}) {
  const unavailable = score === null;
  return (
    <div className={className}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span
          className={cn(
            "font-display text-xs font-semibold tabular-nums text-foreground",
            unavailable && "text-[10px] font-normal italic tabular-nums text-muted-foreground",
          )}
        >
          {unavailable ? "Data not available" : score}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        {unavailable ? null : (
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700",
              score >= 70 ? "bg-gradient-primary" : "bg-primary/35",
            )}
            style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
          />
        )}
      </div>
    </div>
  );
}


export function ScoreDial({ score }: { score: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-[74px] shrink-0">
      <svg viewBox="0 0 74 74" className="size-full -rotate-90">
        <circle cx="37" cy="37" r={r} fill="none" strokeWidth="7" className="stroke-secondary" />
        <circle
          cx="37"
          cy="37"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          className="stroke-primary transition-[stroke-dashoffset] duration-1000"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(100, score)) / 100}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-bold leading-none tabular-nums text-foreground">
          {score}
        </span>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}
