import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";

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
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4 sm:px-8">
          <span className="flex size-9 items-center justify-center rounded-md bg-gradient-primary font-display text-sm font-bold text-primary-foreground">
            SS
          </span>
          <span className="font-display text-sm font-bold uppercase tracking-[0.14em] text-foreground">
            Grade Selector
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        {loading ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="size-8 animate-spin text-primary" />
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
            <div className="mb-8 border-l-4 border-primary pl-5">
              <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
                {TITLE}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Find the right stainless steel grade for your application.
              </p>
            </div>
            <RequirementsForm
              value={requirements}
              onChange={setRequirements}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </>
        )}
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="font-display text-sm font-bold text-foreground">{TITLE}</p>
            <p className="text-xs text-muted-foreground">
              Engineering material selection made simpler.
            </p>
          </div>
          <nav className="flex gap-5 text-xs text-muted-foreground">
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
