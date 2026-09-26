import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User, Bot } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AIRecommendationCard,
  type AIValidatedGrade,
} from "./AIRecommendationCard";

export type AIApplication =
  | "construction"
  | "architecture"
  | "machine-parts"
  | "automotive"
  | "railways"
  | "shipbuilding"
  | "process-industries"
  | "chemical-petrochemical"
  | "food-beverage"
  | "renewable-energy"
  | "power-generation"
  | "oil-gas"
  | "medical-equipment"
  | "consumer-products"
  | "kitchen-appliances"
  | "other";

export type AIEnvironment =
  | "mild-indoor"
  | "outdoor"
  | "marine-coastal"
  | "industrial"
  | "chemical-corrosive"
  | "high-temperature"
  | "low-temperature"
  | "high-humidity"
  | "other";

export type AICostPreference = "budget" | "balanced" | "premium";

export interface AIState {
  application: AIApplication | null;
  environment: AIEnvironment | null;
  costPreference: AICostPreference | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const APPLICATION_OPTIONS: { value: AIApplication; label: string }[] = [
  { value: "construction", label: "Construction & Infrastructure" },
  { value: "architecture", label: "Architecture" },
  { value: "machine-parts", label: "Machine Parts" },
  { value: "automotive", label: "Automotive" },
  { value: "railways", label: "Railways" },
  { value: "shipbuilding", label: "Shipbuilding" },
  { value: "process-industries", label: "Process Industries" },
  { value: "chemical-petrochemical", label: "Chemical & Petrochemical" },
  { value: "food-beverage", label: "Food & Beverage" },
  { value: "renewable-energy", label: "Renewable Energy" },
  { value: "power-generation", label: "Power Generation" },
  { value: "oil-gas", label: "Oil & Gas" },
  { value: "medical-equipment", label: "Medical Equipment" },
  { value: "consumer-products", label: "Consumer Products" },
  { value: "kitchen-appliances", label: "Kitchen & Appliances" },
  { value: "other", label: "Other" },
];

const ENVIRONMENT_OPTIONS: { value: AIEnvironment; label: string }[] = [
  { value: "mild-indoor", label: "Mild / Indoor" },
  { value: "outdoor", label: "Outdoor" },
  { value: "marine-coastal", label: "Marine / Coastal" },
  { value: "industrial", label: "Industrial" },
  { value: "chemical-corrosive", label: "Chemical / Corrosive" },
  { value: "high-temperature", label: "High Temperature" },
  { value: "low-temperature", label: "Low Temperature" },
  { value: "high-humidity", label: "High Humidity" },
  { value: "other", label: "Other" },
];

const COST_OPTIONS: { value: AICostPreference; label: string }[] = [
  { value: "budget", label: "Budget" },
  { value: "balanced", label: "Balanced" },
  { value: "premium", label: "Premium" },
];

const selectClass =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors hover:border-foreground/20 focus:border-primary focus:ring-1 focus:ring-primary/30";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

export function AIMode({
  aiState,
  onAIStateChange,
  messages,
  onMessagesChange,
}: {
  aiState: AIState;
  onAIStateChange: (next: AIState) => void;
  messages: ChatMessage[];
  onMessagesChange: (next: ChatMessage[]) => void;
}) {
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [currentGrades, setCurrentGrades] = useState<AIValidatedGrade[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    onMessagesChange(updatedMessages);
    setInput("");
    setThinking(true);

    try {
      const resp = await fetch("/api/ai-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application: aiState.application,
          environment: aiState.environment,
          costPreference: aiState.costPreference,
          message: text,
          conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = (await resp.json()) as {
        success: boolean;
        message: string;
        error?: string;
        geminiConfigured: boolean;
      };

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message || "I received an empty response. Please try rephrasing your question.",
      };
      onMessagesChange([...updatedMessages, aiMsg]);
    } catch (err) {
      const errMsg =
        err instanceof Error
          ? `I couldn't reach the AI service: ${err.message}. Please check your connection and try again.`
          : "I couldn't reach the AI service. Please check your connection and try again.";
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: errMsg,
      };
      onMessagesChange([...updatedMessages, aiMsg]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top row: input + chat */}
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Input section */}
        <div className="space-y-5">
          <div className="overflow-hidden rounded-md border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="border-b border-border bg-card px-5 py-4 sm:px-6">
              <div className="mb-1 flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-sm border border-border bg-secondary">
                  <Sparkles className="size-3.5 text-primary" />
                </span>
                <div>
                  <h2 className="font-display text-sm font-bold text-foreground">AI Assistant</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Describe your needs and get intelligent recommendations.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              <Field label="Application">
                <select
                  className={selectClass}
                  value={aiState.application ?? ""}
                  onChange={(e) =>
                    onAIStateChange({
                      ...aiState,
                      application: (e.target.value || null) as AIApplication | null,
                    })
                  }
                >
                  <option value="">Select an application…</option>
                  {APPLICATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Environment">
                <select
                  className={selectClass}
                  value={aiState.environment ?? ""}
                  onChange={(e) =>
                    onAIStateChange({
                      ...aiState,
                      environment: (e.target.value || null) as AIEnvironment | null,
                    })
                  }
                >
                  <option value="">Select environment…</option>
                  {ENVIRONMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Cost Preference">
                <div className="grid grid-cols-3 gap-2">
                  {COST_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() =>
                        onAIStateChange({
                          ...aiState,
                          costPreference:
                            aiState.costPreference === o.value ? null : o.value,
                        })
                      }
                      className={cn(
                        "h-10 rounded-md border text-sm font-medium transition-colors",
                        aiState.costPreference === o.value
                          ? "border-primary/50 bg-primary-soft text-primary"
                          : "border-input bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>
        </div>

        {/* Chat section — conversation only, no recommendation cards */}
        <div className="flex h-[420px] flex-col overflow-hidden rounded-md border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 border-b border-border bg-card px-5 py-3">
            <span className="flex size-7 items-center justify-center rounded-sm border border-border bg-secondary">
              <Bot className="size-3.5 text-primary" />
            </span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                AI Chat
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Conversational grade recommendations
              </p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
            {messages.length === 0 && !thinking ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <span className="flex size-12 items-center justify-center rounded-md border border-border bg-secondary">
                  <Sparkles className="size-6 text-primary" />
                </span>
                <p className="font-display text-sm font-semibold text-foreground">
                  Start a conversation
                </p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Describe your application or ask about stainless steel grades to get started.
                </p>
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex gap-3",
                      m.role === "user" ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-sm border",
                        m.role === "user"
                          ? "border-border bg-secondary"
                          : "border-primary/20 bg-primary-soft",
                      )}
                    >
                      {m.role === "user" ? (
                        <User className="size-4 text-muted-foreground" />
                      ) : (
                        <Bot className="size-4 text-primary" />
                      )}
                    </span>
                    <div
                      className={cn(
                        "max-w-[85%] whitespace-pre-wrap rounded-md px-3.5 py-2.5 text-sm leading-relaxed",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-secondary/40 text-foreground",
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}

                {thinking ? (
                  <div className="flex gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                      <Bot className="size-4 text-primary" />
                    </span>
                    <div className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3.5 py-2.5">
                      <span className="size-2 animate-bounce rounded-full bg-primary/50 [animation-delay:0ms]" />
                      <span className="size-2 animate-bounce rounded-full bg-primary/50 [animation-delay:150ms]" />
                      <span className="size-2 animate-bounce rounded-full bg-primary/50 [animation-delay:300ms]" />
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Describe your application or ask about stainless steel grades…"
                className="h-10 flex-1 rounded-md border border-input bg-card px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 hover:border-foreground/20 focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
              <Button
                variant="hero"
                size="icon"
                onClick={() => send(input)}
                disabled={!input.trim() || thinking}
                className="size-10 shrink-0"
              >
                <Send className="size-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated recommendation section — only shown when grades exist */}
      {currentGrades.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">
                Recommended Grades
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Based on your application requirements
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {currentGrades.map((g, i) => (
              <AIRecommendationCard key={`${g.grade}-${i}`} grade={g} rank={i} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
