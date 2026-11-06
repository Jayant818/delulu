// The web app's assistant logic as pure functions on Memory (no React, no network), so it is unit-testable:
// what to do with a chat result (reply / decision / reminder / intent), and which scheduled items are due.
// The in-app "scheduler" runs these when she opens Delulu and every 15 s while it is open (no web push).
import type { ApiResult } from "@/lib/api";
import type { ChatEntry, Memory } from "@/lib/memory";
import type { Outcome } from "@/lib/persona";
import { nextDaily, OUTCOMES, whenIST, type Job } from "@/lib/schedule";

export const PRIVACY_LINE = "Your chats are sealed on 0G. Try-on photos go to OpenAI's image model to make your look, then we delete them.";

export const WEB_HELP = `Just talk to me, like you'd text a friend. No commands. You can also say:
• "help me decide between the Bangalore job and staying in Jaipur"
• "remind me Sunday 6pm to call Riya"
• "what are my reminders" / "cancel the Riya reminder"
• "check in on me every evening at 9" / "stop checking in"
• "is this private?"
• "delete everything"
Or tap Try-on to see a new hair or nail look on you. Reminders and check-ins show up here when you open Delulu.`;

export const WEB_PRIVACY = `${PRIVACY_LINE}
• Chat: every answer comes from a model inside a hardware enclave on 0G Private Computer. Not even 0G or the GPU owner can read it. The request IDs are below.
• Memory: encrypted on this device with a key only your wallet can make. Nothing readable is stored on a server.
• Try-on: your photo goes to OpenAI's image model (not sealed), only to make the look. We never save it, and Delulu keeps only the text.`;

const rid = () => Math.random().toString(16).slice(2, 10);
const entry = (content: string, extra: Partial<ChatEntry> = {}, now = Date.now()): ChatEntry => ({
  role: "assistant",
  content,
  at: new Date(now).toISOString(),
  ...extra,
});

export type Effect = { navigate?: string };

/** Turn one /api/chat result into memory changes. Intents are performed by the app, not described by the model. */
export function applyChatResult(m: Memory, r: ApiResult, meta: ChatEntry["ai"], now: number, demoFast: boolean): { memory: Memory; effect: Effect } {
  const add = (...es: ChatEntry[]) => ({ ...m, chat: [...m.chat, ...es] });
  const intent = r.intent;
  if (intent) {
    switch (intent.type) {
      case "help":
        return { memory: add(entry(WEB_HELP, { kind: "help" }, now)), effect: {} };
      case "privacy":
        return { memory: add(entry(WEB_PRIVACY, { kind: "privacy" }, now)), effect: {} };
      case "forget":
        return {
          memory: add(entry("Delete everything I know about you: your answers, chats, decisions and reminders? This can't be undone.", { kind: "confirm-forget" }, now)),
          effect: {},
        };
      case "checkin_set": {
        const at = demoFast ? now + 60_000 : nextDaily(intent.time, now);
        const jobs: Job[] = [...m.jobs.filter((j) => j.kind !== "daily"), { id: rid(), kind: "daily", at: new Date(at).toISOString() }];
        const text = `Done ✅ I'll check in on you every day at ${intent.time} IST, here in Delulu. First one: ${whenIST(new Date(at).toISOString())}.`;
        return { memory: { ...add(entry(text, {}, now)), jobs, dailyAt: intent.time }, effect: {} };
      }
      case "checkin_off":
        return {
          memory: { ...add(entry("Daily check-in off. I'm still here whenever you want to talk 💛", {}, now)), jobs: m.jobs.filter((j) => j.kind !== "daily"), dailyAt: null },
          effect: {},
        };
      case "reminders_list":
        return { memory: add(entry("Your reminders:", { kind: "reminders" }, now)), effect: {} };
      case "reminder_cancel": {
        const words = intent.match.toLowerCase().split(/\s+/).filter(Boolean);
        const hits = m.jobs.filter((j) => j.kind === "reminder" && words.every((w) => (j.text ?? "").toLowerCase().includes(w)));
        if (hits.length === 1)
          return { memory: { ...add(entry(`Cancelled ⏰ ${hits[0].text}`, {}, now)), jobs: m.jobs.filter((j) => j.id !== hits[0].id) }, effect: {} };
        const lead = hits.length ? "Which one?" : `I couldn't find a reminder about "${intent.match}". Here's what I have:`;
        return { memory: add(entry(lead, { kind: "reminders" }, now)), effect: {} };
      }
      case "decide":
        return { memory: add(entry("Let's look at it from three sides 👀", {}, now)), effect: { navigate: `/decide?q=${encodeURIComponent(intent.question)}` } };
    }
  }

  let content = r.text;
  let jobs = m.jobs;
  if (r.reminder) {
    jobs = [...jobs, { id: rid(), kind: "reminder", at: r.reminder.at, text: r.reminder.text }];
    content += `\n\n⏰ Reminder set: ${r.reminder.text} · ${whenIST(r.reminder.at)} (it shows up here, so open Delulu around then)`;
  }
  const e = entry(content, { ai: meta, ...(r.decision ? { decision: r.decision } : {}) }, now);
  return { memory: { ...add(e), jobs }, effect: {} };
}

/** Deliver every due item into the chat. Returns whether a daily check-in text must be fetched (one 0G call). */
export function runDue(m: Memory, now: number): { memory: Memory; checkinDue: boolean } {
  const due = m.jobs.filter((j) => Date.parse(j.at) <= now);
  if (!due.length) return { memory: m, checkinDue: false };
  let jobs = m.jobs.filter((j) => Date.parse(j.at) > now);
  const chat = [...m.chat];
  let checkinDue = false;
  for (const j of due) {
    if (j.kind === "reminder") chat.push(entry(`⏰ Reminder: ${j.text ?? ""}`, { kind: "reminder" }, now));
    if (j.kind === "checkback") {
      const d = m.decisions.find((x) => x.id === j.ref);
      if (d && !d.outcome) chat.push(entry(`💛 Check-back. You decided: "${d.question}". How did it go?`, { kind: "checkback", ref: d.id }, now));
    }
    if (j.kind === "daily" && m.dailyAt) {
      jobs = [...jobs, { id: rid(), kind: "daily", at: new Date(nextDaily(m.dailyAt, now)).toISOString() }];
      checkinDue = true;
    }
  }
  return { memory: { ...m, chat, jobs }, checkinDue };
}

/** Her answer to a check-back: stored on the decision (the persona sees it from then on). */
export function answerCheckback(m: Memory, decisionId: string, outcome: Outcome, now: number): Memory {
  const reply = OUTCOMES.find((o) => o.key === outcome)!;
  return {
    ...m,
    decisions: m.decisions.map((d) => (d.id === decisionId ? { ...d, outcome } : d)),
    chat: [...m.chat, { role: "user", content: reply.label, at: new Date(now).toISOString() }, entry(reply.reply, {}, now)],
  };
}

/** The check-back job for a decision she just picked. */
export const checkbackJob = (decisionId: string, checkInAt: string): Job => ({ id: rid(), kind: "checkback", at: checkInAt, ref: decisionId });
