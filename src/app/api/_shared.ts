import { NextResponse } from "next/server";
import type { DecisionSummary, Profile, ViewId } from "@/lib/persona";

// Trust boundary: the browser sends her (decrypted) context per request. The server keeps nothing.
// ponytail: no auth or rate limit on these routes; anyone who can reach the server can spend the 0G key.
// Fine on localhost for the demo. Before a public deploy, verify the Privy access token here.

export const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");

export function readProfile(v: unknown): Profile | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const p: Profile = {
    goals: str(o.goals, 600),
    values: str(o.values, 600),
    trusts: str(o.trusts, 600),
    fears: str(o.fears, 600),
    bigDecision: str(o.bigDecision, 600),
  };
  return Object.values(p).some(Boolean) ? p : null;
}

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
