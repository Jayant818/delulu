"use client";
import type { AiResult } from "@/lib/ai/provider";
import type { Memory } from "@/lib/memory";

export async function postAi(url: string, body: unknown): Promise<AiResult> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as AiResult;
}

export const decisionSummaries = (m: Memory) => m.decisions.map(({ question, choice, at }) => ({ question, choice, at }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const aiMeta = ({ text, ...meta }: AiResult) => meta;
