// Delulu on Telegram. Same brain as the web app (src/lib/brain.ts): persona + memory + decision detection +
// three voices, every model call on 0G Private Computer (private trust mode).
// Anti-scam by design: no wallet, no payment, no links, no tokens anywhere in this flow.
// Secretary layer: 30-day decision check-back, daily check-in, reminders from chat. The schedule lives inside
// each user's encrypted record; runDue() delivers what is due.
import { Bot, InlineKeyboard, type Context } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import { randomBytes } from "node:crypto";
import { APP_NAME } from "@/config";
import type { AiResult } from "@/lib/ai/provider";
import { allViews, chatTurn, checkInText, VIEW_ORDER, type Context as BrainContext } from "@/lib/brain";
import { ONBOARDING, VIEWS, type Outcome, type Profile, type ViewId } from "@/lib/persona";
import { newUser, type BotStore, type BotUser, type Job, type Proof } from "./store";

const DAY = 86_400_000;
const IST_MS = 330 * 60_000;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const id = () => randomBytes(4).toString("hex");

/** Next HH:MM in IST strictly after `now`. ponytail: IST only; add a per-user timezone when users are outside India. */
export function nextDaily(hhmm: string, now: number): number {
  const [h, m] = hhmm.split(":").map(Number);
  const ist = new Date(now + IST_MS);
  let t = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), h, m) - IST_MS;
  if (t <= now) t += DAY;
  return t;
}

const OUTCOMES: { key: Outcome; label: string; reply: string }[] = [
  { key: "glad", label: "😊 Glad I did", reply: "Love that for you 💛 Noted. Remember this feeling next time you doubt yourself." },
  { key: "mixed", label: "😐 Mixed", reply: "Mixed is honest, and it's allowed. Want to talk through what's good and what isn't?" },
  { key: "regret", label: "😣 Regret it", reply: "Oof, thank you for telling me. That's not failure, it's information. Want to look at what you can still change?" },
];

export const TEXT = {
  intro: `Hi, I'm <b>${APP_NAME}</b> 💅 the app with the delulu name that gives you the sane answer.

Tell me anything: your day, your drama, the choice keeping you up at night. When you're stuck on a decision, I'll show you three views and check back on you in 30 days.

🔒 My AI runs sealed on 0G Private Computer: not even 0G can read it. I store nothing readable. Telegram carries our messages (/privacy).
🚫 I will <b>never</b> ask for money, crypto, a wallet, passwords, codes, or ask you to click a link. If "${APP_NAME}" ever does, it isn't me.

First, 5 quick questions so I actually know you.`,
  privacy: `<b>What happens to what you tell me</b>
• <b>The AI</b> runs on 0G Private Computer in private mode: inside a hardware enclave, so not even 0G or the GPU owner can read it. /proof shows the request IDs.
• <b>My server</b> stores your setup answers, chat, decisions and reminders encrypted (AES-256-GCM, a key per person). Nothing readable is kept. /forget deletes all of it, for good.
• <b>Telegram</b> carries our messages, like any Telegram chat. Telegram can read bot chats; that part is outside my control.
• No ads, no trackers, no wallet, no payments. Ever.`,
  help: `Just talk to me. Things I can do:
/decide &lt;your decision&gt;: three views right now
"remind me Sunday 6pm to call Riya": I'll remind you
/reminders: see or cancel your reminders
/checkin 21:00: a daily check-in from me (/checkin off to stop)
/proof: the 0G request IDs behind my last answers
/privacy: what happens to your data
/forget: delete everything I know about you
/start: redo the 5 setup questions`,
  busy: `My private brain is taking a moment. Try again in a minute? 🙏`,
  limit: `That's a lot of thinking for one day 😅 Let's pick this up tomorrow.`,
};

/** Small, discreet footer under every AI message. */
export function footer(ai: Omit<AiResult, "text">): string {
  const rid = (ai.requestId ?? "no-id").slice(0, 8);
  if (ai.backend === "0g") return `<i>🔒 0G · ${esc(rid)}${ai.teeVerified === true ? " · TEE ✓" : ai.teeVerified === false ? " · TEE ✗" : ""}</i>`;
  if (ai.backend === "openai") return `<i>⚠️ fallback model, not sealed · ${esc(rid)}</i>`;
  return `<i>MOCK · no AI called</i>`;
}

const proofOf = (ai: AiResult, kind: Proof["kind"]): Proof => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { text, ...meta } = ai;
  return { ...meta, at: new Date().toISOString(), kind };
};

export type BotDeps = {
  store: BotStore;
  dailyLimit?: number;
  checkBackMs?: number; // default 30 days
  demoFast?: boolean; // first daily check-in fires 1 minute after /checkin
};

export function createBot(token: string, deps: BotDeps, botInfo?: UserFromGetMe) {
  const bot = new Bot(token, botInfo ? { botInfo } : undefined);
  const limit = deps.dailyLimit ?? 150;
  const checkBackMs = deps.checkBackMs ?? 30 * DAY;

  // ponytail: updates are handled one at a time (grammY long polling default). Three slow 0G calls for one person
  // delay everyone else. Fine for a demo; use @grammyjs/runner + sequentialize(per chat) for real traffic.

  // Per-user lock: chat handlers and the scheduler never write the same record at the same time.
  const locks = new Map<number, Promise<unknown>>();
  function locked<T>(uid: number, fn: () => Promise<T>): Promise<T> {
    const run = (locks.get(uid) ?? Promise.resolve()).catch(() => {}).then(fn);
    locks.set(uid, run);
    return run.finally(() => locks.get(uid) === run && locks.delete(uid));
  }

  // uid -> earliest job time. In memory only (rebuilt from the encrypted store at start), so runDue() only
  // opens the records that actually have something due.
  const nextDue = new Map<number, number>();
  const track = (u: BotUser) => {
    const t = Math.min(...u.jobs.map((j) => Date.parse(j.at)));
    if (Number.isFinite(t)) nextDue.set(u.uid, t);
    else nextDue.delete(u.uid);
  };

  async function withUser(ctx: Context, fn: (u: BotUser) => Promise<void>) {
    const uid = ctx.from?.id;
    if (!uid) return;
    await locked(uid, async () => {
      const u = (await deps.store.load(uid)) ?? newUser(uid);
      u.uid = uid;
      try {
        await fn(u);
      } finally {
        await deps.store.save(uid, u);
        track(u);
      }
    });
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
    decisions: u.decisions.map(({ question, choice, at, outcome }) => ({ question, choice, at, outcome })),
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
    const uid = ctx.from?.id;
    if (!uid) return;
    await locked(uid, () => deps.store.forget(uid));
    nextDue.delete(uid);
    await ctx.reply("Done. Everything I knew about you is deleted, for good, including reminders. /start if you ever want to begin again 💛");
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
      await showViews(ctx, u, q.slice(0, 300), id());
    }),
  );

  bot.command("checkin", (ctx) =>
    withUser(ctx, async (u) => {
      const arg = ctx.match.trim().toLowerCase();
      u.jobs = u.jobs.filter((j) => j.kind !== "daily");
      if (arg === "off") {
        u.dailyAt = null;
        return void (await ctx.reply("Daily check-in off. I'm still here whenever you want to talk 💛"));
      }
      const m = arg.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
      if (!m) {
        const now = u.dailyAt ? `Right now I check in every day at ${u.dailyAt} IST.` : "No daily check-in yet.";
        return void (await ctx.reply(`${now}\nSet one with /checkin 21:00 (IST, 24h), or /checkin off.`));
      }
      u.dailyAt = `${m[1].padStart(2, "0")}:${m[2]}`;
      const at = deps.demoFast ? Date.now() + 60_000 : nextDaily(u.dailyAt, Date.now());
      u.jobs.push({ id: id(), kind: "daily", at: new Date(at).toISOString() });
      await ctx.reply(`Done ✅ I'll check in on you every day at ${u.dailyAt} IST. First one: ${when(new Date(at).toISOString())}.`);
    }),
  );

  bot.command("reminders", (ctx) =>
    withUser(ctx, async (u) => {
      const rs = u.jobs.filter((j) => j.kind === "reminder").sort((a, b) => a.at.localeCompare(b.at));
      if (!rs.length) return void (await ctx.reply(`No reminders. Just tell me, like "remind me Sunday 6pm to call Riya".`));
      const kb = new InlineKeyboard();
      for (const r of rs) kb.text(`Cancel: ${(r.text ?? "").slice(0, 24)}`, `rc:${r.id}`).row();
      await ctx.reply(rs.map((r) => `⏰ ${esc(r.text ?? "")} · ${when(r.at)}`).join("\n"), { parse_mode: "HTML", reply_markup: kb });
    }),
  );

  bot.callbackQuery(/^rc:([0-9a-f]+)$/, (ctx) =>
    withUser(ctx, async (u) => {
      const before = u.jobs.length;
      u.jobs = u.jobs.filter((j) => !(j.kind === "reminder" && j.id === ctx.match[1]));
      await ctx.answerCallbackQuery(u.jobs.length < before ? "Reminder cancelled" : "Already gone");
      if (u.jobs.length < before) await ctx.reply("Reminder cancelled 👍");
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
      u.jobs.push({ id: id(), kind: "checkback", at: d.checkInAt, ref: d.id });
      delete u.pending[pid];
      await ctx.answerCallbackQuery(`Going with ${VIEWS[view].title}`);
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
      await ctx.reply(`Saved ✅ You're going with <b>${esc(VIEWS[view].title)}</b>.\nI'll check back on you on ${day(d.checkInAt)}.`, {
        parse_mode: "HTML",
      });
    }),
  );

  bot.callbackQuery(/^o:([0-9a-f]+):(glad|mixed|regret)$/, (ctx) =>
    withUser(ctx, async (u) => {
      const [, did, outcome] = ctx.match as unknown as [string, string, Outcome];
      const d = u.decisions.find((x) => x.id === did);
      if (!d) return void (await ctx.answerCallbackQuery("That one is gone"));
      d.outcome = outcome;
      await ctx.answerCallbackQuery("Noted 💛");
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
      await ctx.reply(OUTCOMES.find((o) => o.key === outcome)!.reply);
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
        return void (await ctx.reply(
          `Got it, I know you a little now 💛 Tell me anything. What's on your mind?\n\n(Want me to check in on you every evening? Send /checkin 21:00)`,
        ));
      }
      if (!u.profile) return void (await ctx.reply(`Hi! Tap /start and I'll ask you 5 quick questions first.`));
      if (!spend(u, 1)) return void (await ctx.reply(TEXT.limit));

      await ctx.replyWithChatAction("typing");
      const { reply, decision, reminder, ai } = await chatTurn(brainCtx(u), text);
      const at = new Date().toISOString();
      u.chat = [...u.chat, { role: "user" as const, content: text, at }, { role: "assistant" as const, content: reply, at }].slice(-200);
      u.proofs = [...u.proofs, proofOf(ai, "chat")].slice(-20);

      const kb = new InlineKeyboard();
      let body = `${esc(reply)}\n\n${footer(ai)}`;
      if (decision) {
        const pid = id();
        u.pending[pid] = { question: decision };
        body += `\n\n<b>Sounds like a decision:</b> ${esc(decision)}`;
        kb.text("See 3 views 👀", `v:${pid}`).row();
      }
      if (reminder) {
        const job: Job = { id: id(), kind: "reminder", at: reminder.at, text: reminder.text };
        u.jobs.push(job);
        body += `\n\n⏰ <b>Reminder set:</b> ${esc(reminder.text)} · ${when(reminder.at)}`;
        kb.text("Cancel reminder", `rc:${job.id}`).row();
      }
      await ctx.reply(body, { parse_mode: "HTML", reply_markup: decision || reminder ? kb : undefined });
    }),
  );

  bot.catch(async (err) => {
    // Never log message content: only the error.
    console.error("[bot]", err.error instanceof Error ? err.error.message : String(err.error));
    await err.ctx.reply(TEXT.busy).catch(() => {});
  });

  /** Deliver every job that is due. Called by a timer (src/bot/index.ts) and directly by tests. */
  async function runDue(now = Date.now()): Promise<number> {
    let sent = 0;
    for (const [uid, t] of [...nextDue]) {
      if (t > now) continue;
      await locked(uid, async () => {
        const u = await deps.store.load(uid);
        if (!u) return void nextDue.delete(uid);
        const due = u.jobs.filter((j) => Date.parse(j.at) <= now);
        u.jobs = u.jobs.filter((j) => Date.parse(j.at) > now);
        for (const j of due) {
          try {
            if (j.kind === "reminder") {
              await bot.api.sendMessage(uid, `⏰ <b>Reminder:</b> ${esc(j.text ?? "")}`, { parse_mode: "HTML" });
            } else if (j.kind === "checkback") {
              const d = u.decisions.find((x) => x.id === j.ref);
              if (!d) continue;
              const kb = new InlineKeyboard();
              for (const o of OUTCOMES) kb.text(o.label, `o:${d.id}:${o.key}`);
              await bot.api.sendMessage(
                uid,
                `💛 <b>Check-back.</b> On ${day(d.at)} you decided: <i>${esc(d.question)}</i>\nYou went with <b>${esc(VIEWS[d.choice].title)}</b>. How did it go?`,
                { parse_mode: "HTML", reply_markup: kb },
              );
            } else if (j.kind === "daily") {
              if (!u.dailyAt) continue; // turned off since it was scheduled
              u.jobs.push({ id: id(), kind: "daily", at: new Date(nextDaily(u.dailyAt, now)).toISOString() });
              if (!u.profile || !spend(u, 1)) continue;
              let text = "Hey you 💛 How was today, honestly?";
              let foot = "";
              try {
                const ai = await checkInText(brainCtx(u));
                if (ai.text.trim()) text = ai.text.trim();
                foot = `\n\n${footer(ai)}`;
                u.proofs = [...u.proofs, proofOf(ai, "chat")].slice(-20);
              } catch {
                // 0G unreachable: send the plain check-in rather than nothing.
              }
              await bot.api.sendMessage(uid, `${esc(text)}${foot}`, { parse_mode: "HTML" });
            }
            sent++;
          } catch (e) {
            // e.g. she blocked the bot (403). Drop the job instead of retrying forever; never log content.
            console.error("[bot] scheduled send failed:", e instanceof Error ? e.message : String(e));
          }
        }
        await deps.store.save(uid, u);
        track(u);
      });
    }
    return sent;
  }

  /** Rebuild the in-memory due index from the encrypted store (call once at start). */
  async function loadSchedule(): Promise<void> {
    for (const uid of await deps.store.userIds()) {
      const u = await deps.store.load(uid);
      if (u) track(u);
    }
  }

  return { bot, runDue, loadSchedule };
}
