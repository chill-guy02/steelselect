import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import jslLogo from "@/assets/jsl-logo.png.asset.json";
import { RequirementsForm } from "@/components/steel/RequirementsForm";
import { ResultsView } from "@/components/steel/ResultsView";
import {
  emptyRequirements,
  getRecommendations,
  type RecommendationResult,
  type UserRequirements,
} from "@/lib/recommendations";

const TITLE = "Stainless Steel Grade Selector";
const DESCRIPTION =
  "Find the right stainless steel grade for your application — compare strength, corrosion resistance, toughness, weldability and cost.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stainless Steel Grade Selector — Material Selection Tool" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Stainless Steel Grade Selector" },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Index,
});

function Index() {
  const [requirements, setRequirements] = useState<UserRequirements>(emptyRequirements);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const res = await getRecommendations(requirements);
    setResult(res);
    setLoading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showResults = result !== null && !loading;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <img
              src={jslLogo.url}
              alt="Jindal Stainless"
              className="h-9 w-auto object-contain"
            />
            <span className="leading-tight">
              <span className="block font-display text-sm font-bold uppercase tracking-[0.14em] text-foreground">
                Grade Selector
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Stainless steel material selection
              </span>
            </span>
          </div>
          <span className="hidden rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary sm:inline-block">
            Engineering Tool
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        {loading ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft">
              <Loader2 className="size-8 animate-spin text-primary" />
            </span>
            <p className="font-display text-lg font-semibold text-foreground">
              Analyzing your requirements...
            </p>
            <p className="text-sm text-muted-foreground">
              Matching your inputs against candidate grades.
            </p>
          </div>
        ) : showResults ? (
          <ResultsView
            requirements={requirements}
            result={result}
            onEdit={() => setResult(null)}
          />
        ) : (
          <>
            <section className="mb-10 overflow-hidden rounded-2xl border border-border bg-gradient-hero px-6 py-9 shadow-[var(--shadow-card)] sm:px-10 sm:py-12">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Material Selection
              </span>
              <h1 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-[1.1] text-foreground sm:text-[2.6rem]">
                {TITLE}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {'\n'}
              </p>
              <div className="mt-6 h-px w-32 hairline-rule" />
            </section>
            <RequirementsForm
              value={requirements}
              onChange={setRequirements}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </>
        )}
      </main>

      <footer className="mt-6 border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="font-display text-sm font-bold text-foreground">{TITLE}</p>
            <p className="text-xs text-muted-foreground">
              Engineering material selection made simpler.
            </p>
          </div>
          <nav className="flex gap-5 text-xs font-medium text-muted-foreground">
            <a href="#" className="transition-colors hover:text-primary">
              About
            </a>
            <a href="#" className="transition-colors hover:text-primary">
              Methodology
            </a>
            <a href="#" className="transition-colors hover:text-primary">
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
