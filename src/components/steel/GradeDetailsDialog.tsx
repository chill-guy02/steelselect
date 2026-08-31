import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GradeRecommendation } from "@/lib/recommendations";

export function GradeDetailsDialog({
  grade,
  open,
  onOpenChange,
}: {
  grade: GradeRecommendation | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!grade) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{grade.grade}</DialogTitle>
          <DialogDescription>{grade.family}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Key properties
            </h3>
            <dl className="divide-y divide-border rounded-lg border border-border">
              {grade.properties.map((p) => (
                <div key={p.label} className="flex justify-between gap-4 px-3 py-2 text-sm">
                  <dt className="text-muted-foreground">{p.label}</dt>
                  <dd className="text-right font-medium text-foreground">{p.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Typical applications
            </h3>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {grade.applications.map((a) => (
                <li key={a} className="flex gap-2 text-sm text-foreground">
                  <span className="text-primary">—</span>
                  {a}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Why recommended
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{grade.whyRecommended}</p>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Main trade-offs
            </h3>
            <ul className="space-y-1.5">
              {grade.tradeoffs.map((t) => (
                <li key={t.text} className="flex gap-2 text-sm">
                  <span className={t.type === "positive" ? "text-success" : "text-warning"}>
                    {t.type === "positive" ? "✓" : "⚠"}
                  </span>
                  <span className="text-foreground">{t.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
