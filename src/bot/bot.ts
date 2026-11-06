// Delulu on Telegram. Same brain as the web app (src/lib/brain.ts): persona + memory + decision detection +
// three voices, every model call on 0G Private Computer (private trust mode).
// Anti-scam by design: no wallet, no payment, no links, no tokens anywhere in this flow.
import { Bot, InlineKeyboard, type Context } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import { randomBytes } from "node:crypto";
import { APP_NAME } from "@/config";
import type { AiResult } from "@/lib/ai/provider";
import { allViews, chatTurn, VIEW_ORDER, type Context as BrainContext } from "@/lib/brain";
import { ONBOARDING, VIEWS, type Profile, type ViewId } from "@/lib/persona";
import { newUser, type BotStore, type BotUser, type Proof } from "./store";

const DAY = 86_400_000;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export const TEXT = {
  intro: `Hi, I'm <b>${APP_NAME}</b> 💅 the app with the delulu name that gives you the sane answer.

Tell me anything: your day, your drama, the choice keeping you up at night. When you're stuck on a decision, I'll show you three views and check back on you in 30 days.

🔒 My AI runs sealed on 0G Private Computer: not even 0G can read it. I store nothing readable. Telegram carries our messages (/privacy).
🚫 I will <b>never</b> ask for money, crypto, a wallet, passwords, codes, or ask you to click a link. If "${APP_NAME}" ever does, it isn't me.

First, 5 quick questions so I actually know you.`,
  privacy: `<b>What happens to what you tell me</b>
• <b>The AI</b> runs on 0G Private Computer in private mode: inside a hardware enclave, so not even 0G or the GPU owner can read it. /proof shows the request IDs.
• <b>My server</b> stores your setup answers, chat and decisions encrypted (AES-256-GCM, a key per person). Nothing readable is kept. /forget deletes all of it, for good.
• <b>Telegram</b> carries our messages, like any Telegram chat. Telegram can read bot chats; that part is outside my control.
• No ads, no trackers, no wallet, no payments. Ever.`,
  help: `Just talk to me. Commands:
/decide &lt;your decision&gt;: three views right now
/proof: the 0G request IDs behind my last answers
/privacy: what happens to your data
/forget: delete everything I know about you
/start: redo the 5 setup questions`,
  busy: `My private brain is taking a moment. Try again in a minute? 🙏`,
  limit: `That's a lot of thinking for one day 😅 Let's pick this up tomorrow.`,
};

/** Small, discreet footer under every AI message. */
export function footer(ai: Omit<AiResult, "text">): string {
  const id = (ai.requestId ?? "no-id").slice(0, 8);
  if (ai.backend === "0g") return `<i>🔒 0G · ${esc(id)}${ai.teeVerified === true ? " · TEE ✓" : ai.teeVerified === false ? " · TEE ✗" : ""}</i>`;
  if (ai.backend === "openai") return `<i>⚠️ fallback model, not sealed · ${esc(id)}</i>`;
  return `<i>MOCK · no AI called</i>`;
}

const proofOf = (ai: AiResult, kind: Proof["kind"]): Proof => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { text, ...meta } = ai;
  return { ...meta, at: new Date().toISOString(), kind };
};

export type BotDeps = { store: BotStore; dailyLimit?: number; checkBackMs?: number };

export function createBot(token: string, deps: BotDeps, botInfo?: UserFromGetMe) {
  const bot = new Bot(token, botInfo ? { botInfo } : undefined);
  const limit = deps.dailyLimit ?? 150;
  const checkBackMs = deps.checkBackMs ?? 30 * DAY;

  // ponytail: updates are handled one at a time (grammY long polling default). Three slow 0G calls for one person
  // delay everyone else. Fine for a demo; use @grammyjs/runner + sequentialize(per chat) for real traffic.

  async function withUser(ctx: Context, fn: (u: BotUser) => Promise<void>) {
    const id = ctx.from?.id;
    if (!id) return;
    const u = (await deps.store.load(id)) ?? newUser();
    try {
      await fn(u);
    } finally {
      await deps.store.save(id, u);
    }
  }

  // Counts model calls per person per day, so a stranger cannot burn the team's 0G credits.
  function spend(u: BotUser, n: number): boolean {
    const today = new Date().toISOString().slice(0, 10);
    if (u.usage.day !== today) u.usage = { day: today, count: 0 };
    if (u.usage.count + n > limit) return false;
    u.usage.count += n;
    return true;
  }

  const brainCtx = (u: BotUser): BrainContext => ({
    profile: u.profile!,
    decisions: u.decisions.map(({ question, choice, at }) => ({ question, choice, at })),
    history: u.chat.slice(-20).map(({ role, content }) => ({ role, content })),
  });

  const askQuestion = (ctx: Context, step: number) => {
    const q = ONBOARDING[step];
    return ctx.reply(`<b>${step + 1}/${ONBOARDING.length}</b> ${esc(q.q)}\n<i>${esc(q.hint)}</i>`, { parse_mode: "HTML" });
  };

  async function showViews(ctx: Context, u: BotUser, question: string, pid: string) {
    if (!spend(u, 3)) return void (await ctx.reply(TEXT.limit));
    await ctx.replyWithChatAction("typing");
    const results = await allViews(brainCtx(u), question);
    const views: Partial<Record<ViewId, string>> = {};
    const parts = [`<b>Your decision:</b> ${esc(question)}`];
    for (const v of VIEW_ORDER) {
      const r = results[v];
      if ("error" in r) {
        parts.push(`<b>${esc(VIEWS[v].title)}</b>\n<i>couldn't answer right now</i>`);
        continue;
      }
      views[v] = r.text;
      u.proofs = [...u.proofs, proofOf(r, "view")].slice(-20);
      parts.push(`<b>${esc(VIEWS[v].title)}</b>\n${esc(r.text)}\n${footer(r)}`);
    }
    u.pending[pid] = { question, views };
    const kb = new InlineKeyboard();
    for (const v of VIEW_ORDER) if (views[v]) kb.text(`Go with ${VIEWS[v].title}`, `p:${pid}:${v}`).row();
    await ctx.reply(parts.join("\n\n"), { parse_mode: "HTML", reply_markup: kb });
  }

  bot.command("start", (ctx) =>
    withUser(ctx, async (u) => {
      u.onboarding = { step: 0, answers: {} };
      await ctx.reply(TEXT.intro, { parse_mode: "HTML" });
      await askQuestion(ctx, 0);
    }),
  );
  bot.command("help", (ctx) => ctx.reply(TEXT.help, { parse_mode: "HTML" }));
  bot.command("privacy", (ctx) => ctx.reply(TEXT.privacy, { parse_mode: "HTML" }));

  bot.command("forget", async (ctx) => {
    if (!ctx.from) return;
    await deps.store.forget(ctx.from.id);
    await ctx.reply("Done. Everything I knew about you is deleted, for good. /start if you ever want to begin again 💛");
  });

  bot.command("proof", (ctx) =>
    withUser(ctx, async (u) => {
      if (!u.proofs.length) return void (await ctx.reply("No answers yet. Talk to me first 🙂"));
      const lines = u.proofs.slice(-10).map((p) => {
        const tee = p.teeVerified === true ? "TEE ✓" : p.teeVerified === false ? "TEE ✗" : "no TEE check";
        const where = p.backend === "0g" ? `0G ${p.model}` : p.backend === "openai" ? "fallback (not sealed)" : "MOCK";
        return `• ${p.kind} · ${where} · <code>${esc(p.requestId ?? "no-id")}</code> · ${tee}`;
      });
      await ctx.reply(`<b>Request IDs behind my last answers</b>\n${lines.join("\n")}`, { parse_mode: "HTML" });
    }),
  );

  bot.command("decide", (ctx) =>
    withUser(ctx, async (u) => {
      if (!u.profile) return void (await ctx.reply("Let's do the 5 setup questions first: /start"));
      const q = ctx.match.trim();
      if (!q) return void (await ctx.reply("Tell me the decision, like: /decide take the Bangalore job or stay in Jaipur"));
      await showViews(ctx, u, q.slice(0, 300), randomBytes(4).toString("hex"));
    }),
  );

  bot.callbackQuery(/^v:([0-9a-f]+)$/, (ctx) =>
    withUser(ctx, async (u) => {
      const pid = ctx.match[1];
      const pend = u.pending[pid];
      await ctx.answerCallbackQuery(pend ? "Asking all three…" : "That one expired");
      if (pend && u.profile) await showViews(ctx, u, pend.question, pid);
    }),
  );

  bot.callbackQuery(/^p:([0-9a-f]+):(sane|future|bestie)$/, (ctx) =>
    withUser(ctx, async (u) => {
      const [, pid, view] = ctx.match as unknown as [string, string, ViewId];
      const pend = u.pending[pid];
      if (!pend?.views) return void (await ctx.answerCallbackQuery("That one expired"));
      const now = new Date();
      const d = { id: pid, question: pend.question, choice: view, at: now.toISOString(), checkInAt: new Date(+now + checkBackMs).toISOString(), views: pend.views };
      u.decisions = [...u.decisions, d];
      delete u.pending[pid];
      await ctx.answerCallbackQuery(`Going with ${VIEWS[view].title}`);
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
      await ctx.reply(`Saved ✅ You're going with <b>${esc(VIEWS[view].title)}</b>.\nI'll check back on you on ${day(d.checkInAt)}.`, {
        parse_mode: "HTML",
      });
    }),
  );

  bot.on("message:text", (ctx) =>
    withUser(ctx, async (u) => {
      const text = ctx.message.text.trim().slice(0, 2000);
      if (!text) return;

      // Onboarding: one answer per message.
      if (u.onboarding) {
        const q = ONBOARDING[u.onboarding.step];
        u.onboarding.answers[q.key as keyof Profile] = text.slice(0, 600);
        if (u.onboarding.step + 1 < ONBOARDING.length) {
          u.onboarding.step += 1;
          return void (await askQuestion(ctx, u.onboarding.step));
        }
        u.profile = { goals: "", values: "", trusts: "", fears: "", bigDecision: "", ...u.onboarding.answers };
        u.onboarding = null;
        return void (await ctx.reply(`Got it, I know you a little now 💛 Tell me anything. What's on your mind?`));
      }
      if (!u.profile) return void (await ctx.reply(`Hi! Tap /start and I'll ask you 5 quick questions first.`));
      if (!spend(u, 1)) return void (await ctx.reply(TEXT.limit));

      await ctx.replyWithChatAction("typing");
      const { reply, decision, ai } = await chatTurn(brainCtx(u), text);
      const at = new Date().toISOString();
      u.chat = [...u.chat, { role: "user" as const, content: text, at }, { role: "assistant" as const, content: reply, at }].slice(-200);
      u.proofs = [...u.proofs, proofOf(ai, "chat")].slice(-20);

      let markup: InlineKeyboard | undefined;
      let body = `${esc(reply)}\n\n${footer(ai)}`;
      if (decision) {
        const pid = randomBytes(4).toString("hex");
        u.pending[pid] = { question: decision };
        body += `\n\n<b>Sounds like a decision:</b> ${esc(decision)}`;
        markup = new InlineKeyboard().text("See 3 views 👀", `v:${pid}`);
      }
      await ctx.reply(body, { parse_mode: "HTML", reply_markup: markup });
    }),
  );

  bot.catch(async (err) => {
    // Never log message content: only the error.
    console.error("[bot]", err.error instanceof Error ? err.error.message : String(err.error));
    await err.ctx.reply(TEXT.busy).catch(() => {});
  });

  return bot;
}
