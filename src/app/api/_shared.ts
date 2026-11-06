import { NextResponse } from "next/server";
import { demoRetryAfter } from "@/lib/demoGuard";
import { normalizeProfile, type DecisionSummary, type ViewId } from "@/lib/persona";

// Trust boundary: context is transient; only demo usage counters stay in memory.
// The deployment proxy must overwrite client-supplied forwarding headers.

export function guardDemo(req: Request) {
  const retry = demoRetryAfter(req.headers);
  if (retry) return NextResponse.json(
    { error: "demo_limit", message: "Delulu is resting. This demo has a daily limit so it stays free. Try again later." },
    { status: 429, headers: { "Retry-After": String(retry) } },
  );
}

export const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");

// A brand-new user has no facts yet; that is normal (no setup questions), never an error.
export const readProfile = normalizeProfile;

const VIEW_IDS: ViewId[] = ["sane", "future", "bestie"];
export const isView = (v: unknown): v is ViewId => VIEW_IDS.includes(v as ViewId);

export function readDecisions(v: unknown): DecisionSummary[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(-15)
    .filter((d) => d && isView(d.choice))
    .map((d) => ({
      question: str(d.question, 200),
      choice: d.choice,
      at: str(d.at, 30),
      outcome: ["glad", "mixed", "regret"].includes(d.outcome) ? d.outcome : undefined,
    }));
}

// Only "user" / "assistant" turns pass: a "system" message sent from the browser could otherwise rewrite the persona.
export function readHistory(v: unknown, max: number): { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(-max)
    .filter((m) => m?.role === "user" || m?.role === "assistant")
    .map((m) => ({ role: m.role, content: str(m.content, 2000) }));
}

export function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}
