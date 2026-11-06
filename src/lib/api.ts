"use client";
import type { AiResult } from "@/lib/ai/provider";
import type { Memory } from "@/lib/memory";
import type { Intent, Reminder } from "@/lib/persona";

export type ApiResult = AiResult & { decision?: string | null; reminder?: Reminder | null; intent?: Intent | null; remember?: string[] };

/** The public demo's spend guard said no (HTTP 429 demo_limit): the UI shows a calm note, not an error. */
export class DemoLimitError extends Error {
  name = "DemoLimitError";
}
export const isDemoLimit = (e: unknown) => e instanceof Error && e.name === "DemoLimitError";

export async function postAi(url: string, body: unknown): Promise<ApiResult> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok && data.error === "demo_limit") throw new DemoLimitError(data.message);
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as ApiResult;
}

export const decisionSummaries = (m: Memory) => m.decisions.map(({ question, choice, at, outcome }) => ({ question, choice, at, outcome }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const aiMeta = ({ text, decision, reminder, intent, remember, ...meta }: ApiResult) => meta;

export const chatLines = (m: Memory, n: number) => m.chat.slice(-n).map(({ role, content }) => ({ role, content }));
