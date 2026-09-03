import { cn } from "@/lib/utils";
import {
  CORE_SCORE_KEYS,
  OPTIONAL_SCORE_KEYS,
  SCORE_LABELS,
  type GradeRecommendation,
  type OptionalScoreKey,
} from "@/lib/recommendations";

export function ComparisonTable({
  recommendations,
  consideredOptional,
}: {
  recommendations: GradeRecommendation[];
  consideredOptional: OptionalScoreKey[];
}) {
  const rows = [
    ...CORE_SCORE_KEYS.map((k) => ({ key: k, considered: true as const })),
    ...OPTIONAL_SCORE_KEYS.map((k) => ({
      key: k,
      considered: consideredOptional.includes(k),
    })),
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/70 [&>th]:whitespace-nowrap">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Parameter
              </th>
              {recommendations.map((r) => (
                <th
                  key={r.grade}
                  className="px-4 py-3 text-center font-display text-sm font-bold text-foreground"
                >
                  {r.grade}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border bg-primary-soft">
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                Overall Score
              </th>
              {recommendations.map((r) => (
                <td
                  key={r.grade}
                  className="px-4 py-3 text-center font-display font-bold tabular-nums text-primary"
                >
                  {r.overallScore}
                </td>
              ))}
            </tr>
            {rows.map((row) => (
              <tr
                key={row.key}
                className={cn(
                  "border-b border-border transition-colors last:border-b-0 hover:bg-accent/40",
                  !row.considered && "opacity-55",
                )}
              >
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  {SCORE_LABELS[row.key]}
                </th>
                {recommendations.map((r) => (
                  <td key={r.grade} className="px-4 py-3 text-center tabular-nums">
                    {!row.considered ? (
                      <span className="text-xs italic text-muted-foreground">Not considered</span>
                    ) : r.scores[row.key] === null ? (
                      <span className="text-xs italic text-muted-foreground">
                        Data not available
                      </span>
                    ) : (
                      <span className="font-medium text-foreground">{r.scores[row.key]}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
