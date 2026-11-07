// Server-only, channel-agnostic "brain": the web API routes and the Telegram bot both call these.
// Every model call goes through complete() -> 0G Private Computer (private trust mode) first.
import { complete, type AiResult } from "@/lib/ai/provider";
import { looksPrompt } from "@/lib/looks";
import {
  briefPrompt,
  checkInPrompt,
  chatSystemPrompt,
  parseChatReply,
  viewSystemPrompt,
  type ChatLine,
  type Channel,
  type ChatReply,
  type DecisionSummary,
  type Profile,
  type ViewId,
} from "@/lib/persona";

export const VIEW_ORDER: ViewId[] = ["sane", "future", "bestie"];

export type Context = { profile: Profile; decisions: DecisionSummary[]; history: ChatLine[] };

/** One chat turn: a reply, plus a one-line decision when her message contains a real choice. */
export async function chatTurn(ctx: Context, message: string, opts: { channel?: Channel } = {}): Promise<ChatReply & { ai: AiResult }> {
  const ai = await complete(
    [
      { role: "system", content: chatSystemPrompt(ctx.profile, ctx.decisions, new Date(), opts.channel ?? "telegram") },
      ...ctx.history.slice(-20),
      { role: "user", content: message },
    ],
    { json: true },
  );
  const parsed = parseChatReply(ai.text);
  return { ...parsed, ai: { ...ai, text: parsed.reply } };
}

/** Daily check-in text (one 0G call). */
export function checkInText(ctx: Context): Promise<AiResult> {
  return complete(
    [
      { role: "system", content: checkInPrompt(ctx.profile, ctx.decisions, ctx.history.slice(-10)) },
      { role: "user", content: "Write today's check-in." },
    ],
    { maxTokens: 120 },
  );
}

/** One of the three voices on a decision. */
export function viewOn(view: ViewId, ctx: Context, question: string): Promise<AiResult> {
  return complete(
    [
      { role: "system", content: viewSystemPrompt(view, ctx.profile, ctx.decisions, ctx.history.slice(-10)) },
      { role: "user", content: `The decision I am facing: ${question}` },
    ],
    { maxTokens: 400 },
  );
}

/** All three voices in parallel: three separate 0G requests, three request IDs. A failed voice does not sink the others. */
export async function allViews(ctx: Context, question: string): Promise<Record<ViewId, AiResult | { error: string }>> {
  const results = await Promise.all(
    VIEW_ORDER.map((v) => viewOn(v, ctx, question).catch((e: Error) => ({ error: e.message }))),
  );
  return Object.fromEntries(VIEW_ORDER.map((v, i) => [v, results[i]])) as Record<ViewId, AiResult | { error: string }>;
}

/** Three try-on ideas that fit the chat, after her photo (one 0G call, text only: the photo never comes here). */
export function looksFor(profile: Profile, history: ChatLine[]): Promise<AiResult> {
  return complete(
    [
      { role: "system", content: looksPrompt(profile, history) },
      { role: "user", content: "Suggest 3 looks for my photo." },
    ],
    { json: true, maxTokens: 300 },
  );
}

/** Stylist / nail tech brief for a try-on look (one 0G call, text only). */
export function briefFor(kind: "hair" | "nails" | "face", style: string, profile: Profile): Promise<AiResult> {
  return complete(
    [
      { role: "system", content: briefPrompt(kind, style, profile) },
      { role: "user", content: `Brief for: ${style}` },
    ],
    { maxTokens: 220 },
  );
}
