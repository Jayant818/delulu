// Shared by client (types, questions) and server (prompt builders). No secrets here.
import { APP_NAME } from "@/config";

export type Profile = {
  goals: string;
  values: string;
  trusts: string;
  fears: string;
  bigDecision: string;
};

export const ONBOARDING: { key: keyof Profile; q: string; hint: string }[] = [
  { key: "goals", q: "What do you want your life to look like in a few years?", hint: "Career, money, love, where you live: anything." },
  { key: "values", q: "What matters most to you, even when it is hard?", hint: "Freedom, family, honesty, ambition..." },
  { key: "trusts", q: "Who do you trust when you have to choose something big?", hint: "A person, a group, or 'only myself'." },
  { key: "fears", q: "What are you afraid of getting wrong?", hint: "Say it plainly. Only you can read this." },
  { key: "bigDecision", q: "What is one big decision in front of you right now?", hint: "We can start with this one." },
];

export type ViewId = "sane" | "future" | "bestie";

export const VIEWS: Record<ViewId, { title: string; voice: string; style: string }> = {
  sane: {
    title: APP_NAME,
    voice: `${APP_NAME}, the sane one`,
    style: `The joke: an app called ${APP_NAME} that gives the SANE answer. Tone is playful Gen Z (light slang, at most one emoji), but the advice is grounded: name the real trade-off, the cost of each option, and one concrete next step she can take this week. No hype, no manifesting.`,
  },
  future: {
    title: "Future You at 30",
    voice: "her own future self, at age 30, looking back",
    style: "Speak as her, at 30, in the first person. Say what mattered in the end and what she will be glad she did. Warm, honest, specific to her goals and values.",
  },
  bestie: {
    title: "Your Bestie",
    voice: "her loyal best friend",
    style: "Talk like a best friend: casual, protective, a bit funny, but honest. Check how she feels. Say what you would tell her over chai.",
  },
};

export type Outcome = "glad" | "mixed" | "regret";
export type DecisionSummary = { question: string; choice: ViewId; at: string; outcome?: Outcome };
const OUTCOME_TEXT: Record<Outcome, string> = { glad: "she is glad she did", mixed: "mixed feelings", regret: "she regrets it" };

const SAFETY = `If she mentions self-harm, abuse, violence, or being in danger, stop giving advice. Tell her clearly that she deserves help now, and suggest a trusted adult or a helpline (in India: 112 for emergencies, Tele-MANAS 14416 for mental health support).
Never pretend to be human. Never shame her. Never decide for her: help her decide.`;

const clip = (s: unknown, n: number) => String(s ?? "").slice(0, n);

export function profileBlock(p: Profile): string {
  return `ABOUT HER (her own words):
- Goals: ${clip(p.goals, 600)}
- Values: ${clip(p.values, 600)}
- Who she trusts: ${clip(p.trusts, 600)}
- What she fears: ${clip(p.fears, 600)}
- Big decision right now: ${clip(p.bigDecision, 600)}`;
}

function pastDecisionsBlock(ds: DecisionSummary[]): string {
  if (!ds.length) return "PAST DECISIONS: none yet.";
  return (
    "PAST DECISIONS (most recent last):\n" +
    ds
      .slice(-15)
      .map(
        (d) =>
          `- ${clip(d.at, 10)}: "${clip(d.question, 200)}" -> she went with ${VIEWS[d.choice]?.title ?? d.choice}` +
          (d.outcome ? ` (30 days later: ${OUTCOME_TEXT[d.outcome] ?? d.outcome})` : ""),
      )
      .join("\n")
  );
}

export type ChatLine = { role: "user" | "assistant"; content: string };

function recentChatBlock(lines: ChatLine[]): string {
  if (!lines.length) return "RECENT CHAT: none yet.";
  return "RECENT CHAT (oldest first):\n" + lines.slice(-10).map((l) => `- ${l.role === "user" ? "Her" : APP_NAME}: ${clip(l.content, 300)}`).join("\n");
}

// Chat replies are JSON so a decision hidden in free talk can be pulled out into the 3-voice Decide screen.
// IST is the only timezone for now (Jayant's users); reminders are resolved against this clock.
export function nowLineIST(now = new Date()): string {
  const ist = new Date(+now + 330 * 60_000);
  const wd = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][ist.getUTCDay()];
  return `NOW: ${ist.toISOString().slice(0, 16).replace("T", " ")} IST (${wd}), UTC+05:30`;
}

// canRemind: only the Telegram bot has a scheduler. Elsewhere the model must not promise reminders.
export function chatSystemPrompt(p: Profile, ds: DecisionSummary[], now = new Date(), canRemind = true): string {
  return `VOICE: ${VIEWS.sane.voice}
You are ${APP_NAME}, a private AI companion. She can tell you anything: her day, her feelings, her plans, her drama. You listen, remember, and help her think. The joke is the name: ${APP_NAME} gives the sane answer. Playful Gen Z tone (light slang, at most one emoji), grounded advice. You remember what she told you and what she decided before. Keep replies short (under 120 words), ask one good question at a time, and connect advice to her own goals and values.

${profileBlock(p)}

${pastDecisionsBlock(ds)}

${SAFETY}

${nowLineIST(now)}

OUTPUT FORMAT: answer with ONE JSON object and nothing else:
{"reply": "<your message to her>", "decision": <null or "<one line, max 15 words: the choice she is weighing, e.g. Take the Bangalore job or stay in Jaipur>">, "reminder": <null or {"text": "<what to remind her, max 12 words>", "at": "<ISO 8601 time with +05:30>"}>}
Set "decision" only when her LATEST message shows a real choice she has to make (two or more options, or yes/no on something that matters). Small talk, venting with no choice, or a decision she already made: null.
${
    canRemind
      ? `Set "reminder" only when her LATEST message asks you to remind her of something at a time you can work out from NOW. Otherwise null. If she asks for a reminder but the time is unclear, ask her when in "reply" and set "reminder" to null.`
      : `Always set "reminder" to null: you cannot set reminders here. If she asks, tell her reminders work in the ${APP_NAME} Telegram bot.`
  }`;
}

export type Reminder = { text: string; at: string };
export type ChatReply = { reply: string; decision: string | null; reminder: Reminder | null };

// A reminder is only accepted if its time parses and lies between now and one year from now.
function readReminder(v: unknown, now: number): Reminder | null {
  if (!v || typeof v !== "object") return null;
  const r = v as { text?: unknown; at?: unknown };
  const text = typeof r.text === "string" ? r.text.trim().slice(0, 120) : "";
  const at = typeof r.at === "string" ? Date.parse(r.at) : NaN;
  if (!text || !Number.isFinite(at) || at <= now || at > now + 366 * 86_400_000) return null;
  return { text, at: new Date(at).toISOString() };
}

// Tolerant parser: plain JSON, JSON inside a code fence, or prose with a JSON object in it.
// Anything unparseable becomes a plain reply with no decision, so chat never breaks on a format slip.
export function parseChatReply(raw: string, now = Date.now()): ChatReply {
  const text = String(raw ?? "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const o = JSON.parse(text.slice(start, end + 1));
      if (o && typeof o.reply === "string" && o.reply.trim()) {
        const d = typeof o.decision === "string" ? o.decision.trim().slice(0, 160) : "";
        return { reply: o.reply.trim(), decision: d || null, reminder: readReminder(o.reminder, now) };
      }
    } catch {}
  }
  return { reply: text, decision: null, reminder: null };
}

export function viewSystemPrompt(view: ViewId, p: Profile, ds: DecisionSummary[], chat: ChatLine[] = []): string {
  const v = VIEWS[view];
  return `VOICE: ${v.voice}
You are one of three voices that help her with a decision. You are ${v.voice}. ${v.style}
Answer in under 110 words. End with one short line that starts with "My call:".

${profileBlock(p)}

${pastDecisionsBlock(ds)}

${recentChatBlock(chat)}

${SAFETY}`;
}

// Daily check-in: one short, warm, specific nudge. Never generic, never pushy.
export function checkInPrompt(p: Profile, ds: DecisionSummary[], chat: ChatLine[] = [], now = new Date()): string {
  return `VOICE: ${VIEWS.sane.voice}
You are ${APP_NAME}. Write ONE short daily check-in message to her (max 40 words). Make it specific: refer to something from her recent chat, a decision she is living with, or one of her goals. Playful Gen Z tone, at most one emoji. End with a question she can answer in one line. Plain text only.

${profileBlock(p)}

${pastDecisionsBlock(ds)}

${recentChatBlock(chat)}

${nowLineIST(now)}

${SAFETY}`;
}
