import { Lightbulb, Star, ChevronRight } from "lucide-react";

const TIPS = [
  {
    title: "Chloride environments",
    desc: "Choose 316L or duplex grades for superior pitting and crevice resistance.",
  },
  {
    title: "High temperatures",
    desc: "310S is the go-to austenitic grade for sustained elevated-temperature service.",
  },
  {
    title: "Deep drawing",
    desc: "304 / 304L offer excellent formability for complex drawn or stretched shapes.",
  },
  {
    title: "Corrosion vs. cost",
    desc: "Balance resistance needs with budget — ferritic grades often suffice for mild environments.",
  },
];

const POPULAR = [
  { grade: "304", desc: "General purpose" },
  { grade: "316L", desc: "High corrosion resistance" },
  { grade: "430", desc: "Ferritic" },
  { grade: "2205", desc: "Duplex / high strength" },
  { grade: "410", desc: "Martensitic / wear resistant" },
];

export function SelectionSidebar() {
  return (
    <aside className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft">
            <Lightbulb className="size-4 text-primary" />
          </span>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            Selection Tips
          </h3>
        </div>
        <ul className="space-y-2.5">
          {TIPS.map((tip) => (
            <li
              key={tip.title}
              className="rounded-xl border border-border/60 bg-secondary/40 p-3.5 transition-colors hover:border-primary/25 hover:bg-accent/30"
            >
              <p className="text-xs font-semibold text-foreground">{tip.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{tip.desc}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft">
            <Star className="size-4 text-primary" />
          </span>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            Popular Grades
          </h3>
        </div>
        <ul className="divide-y divide-border">
          {POPULAR.map((g) => (
            <li key={g.grade}>
              <button
                type="button"
                className="group flex w-full items-center justify-between rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <span>
                  <span className="block text-sm font-bold text-foreground">SS {g.grade}</span>
                  <span className="block text-[11px] text-muted-foreground">{g.desc}</span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
