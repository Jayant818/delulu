// Server-only, channel-agnostic "brain": the web API routes and the Telegram bot both call these.
// Every model call goes through complete() -> 0G Private Computer (private trust mode) first.
import { complete, type AiResult } from "@/lib/ai/provider";
import {
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
