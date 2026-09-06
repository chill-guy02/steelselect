import { useState } from "react";
import { ArrowRight, AlertCircle, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  APPLICATION_OPTIONS,
  CORROSION_OPTIONS,
  type Application,
  type CorrosionResistance,
  type UserRequirements,
} from "@/lib/recommendations";

interface Props {
  value: UserRequirements;
  onChange: (next: UserRequirements) => void;
  onSubmit: () => void;
  loading: boolean;
}

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-xs outline-none transition-all placeholder:text-muted-foreground/70 hover:border-primary/35 focus:border-primary focus:ring-4 focus:ring-primary/12";

function Section({
  index,
  title,
  hint,
  children,
}: {
  index: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border px-5 py-8 first:border-t-0 sm:px-8">
      <div className="mb-6 flex items-start gap-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-xs font-bold tracking-[0.06em] text-primary ring-1 ring-primary/20">
          {index}
        </span>
        <div className="pt-0.5">
          <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  unit,
  required,
  children,
}: {
  label: string;
  unit?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
        {label}
        {unit ? <span className="text-xs font-normal text-muted-foreground">({unit})</span> : null}
        {required ? (
          <span className="rounded-sm bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Required
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            (HBW) OPTIONAL
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

const ADDITIONAL = [
  {
    key: "considerWeldability",
    label: "Weldability",
    desc: "Ease and reliability of welding",
  },
  {
    key: "considerFormability",
    label: "Formability",
    desc: "Suitability for forming and fabrication",
  },
  { key: "considerCost", label: "Cost", desc: "Material cost / value" },
] as const;

export function RequirementsForm({ value, onChange, onSubmit, loading }: Props) {
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof UserRequirements>(key: K, v: UserRequirements[K]) =>
    onChange({ ...value, [key]: v });

  const num = (raw: string) => (raw.trim() === "" ? null : Number(raw));

  const handleSubmit = () => {
    if (!value.application) {
      setError("Please select an application to continue.");
      return;
    }
    setError(null);
    onSubmit();
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <Section index="01" title="Application" hint="Where will this material be used?">
        <div className="max-w-md">
          <Field label="Application" required>
            <select
              className={fieldClass}
              value={value.application ?? ""}
              onChange={(e) => {
                set("application", (e.target.value || null) as Application | null);
                setError(null);
              }}
            >
              <option value="">Select an application…</option>
              {APPLICATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section
        index="02"
        title="Performance Requirements"
        hint="All optional — fill in what you know."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Minimum UTS" unit="MPa">
            <input
              type="number"
              inputMode="decimal"
              placeholder="550"
              className={fieldClass}
              value={value.minimumUTS ?? ""}
              onChange={(e) => set("minimumUTS", num(e.target.value))}
            />
          </Field>

          <Field label="Corrosion Resistance">
            <select
              className={fieldClass}
              value={value.corrosionResistance ?? ""}
              onChange={(e) =>
                set("corrosionResistance", (e.target.value || null) as CorrosionResistance | null)
              }
            >
              <option value="">No preference</option>
              {CORROSION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Brinell hardness">
            <input
              type="number"
              inputMode="decimal"
              placeholder="27"
              className={fieldClass}
              value={value.impactToughness ?? ""}
              onChange={(e) => set("impactToughness", num(e.target.value))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Min. Temp." unit="°C">
              <input
                type="number"
                placeholder="-40"
                className={fieldClass}
                value={value.operatingTemperatureMin ?? ""}
                onChange={(e) => set("operatingTemperatureMin", num(e.target.value))}
              />
            </Field>
            <Field label="Max. Temp." unit="°C">
              <input
                type="number"
                placeholder="400"
                className={fieldClass}
                value={value.operatingTemperatureMax ?? ""}
                onChange={(e) => set("operatingTemperatureMax", num(e.target.value))}
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section
        index="03"
        title="Additional Parameters"
        hint="Which additional factors should we consider?"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {ADDITIONAL.map((item) => {
            const active = value[item.key];
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={active}
                onClick={() => set(item.key, !active)}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-all",
                  active
                    ? "border-primary/60 bg-primary-soft shadow-[var(--shadow-card)]"
                    : "border-border bg-card hover:border-primary/40 hover:bg-accent/40",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    active ? "border-primary bg-primary" : "border-input bg-background",
                  )}
                >
                  {active ? <Check className="size-3.5 text-primary-foreground" /> : null}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{item.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <div className="border-t border-border bg-secondary/50 px-5 py-7 sm:px-8">
        {error ? (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle className="size-4" />
            {error}
          </div>
        ) : null}
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-xs text-muted-foreground">
            {'\n'}
          </p>
          <Button
            variant="hero"
            size="xl"
            disabled={loading}
            onClick={handleSubmit}
            className="w-full sm:w-auto"
          >
            {loading ? "Analyzing…" : "Find Recommended Grades"}
            <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
