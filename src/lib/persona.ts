// Shared by client (types, questions) and server (prompt builders). No secrets here.
import { APP_NAME } from "@/config";

// What Delulu knows about her: short facts it picked up from the chat (no setup questions, Jayant TG 3486).
// Stored inside her encrypted memory like everything else.
export type Profile = { facts: string[] };
export const MAX_FACTS = 40;

/** Any stored or received profile -> { facts }. Old records (5 setup answers) become facts, so nothing is lost. */
export function normalizeProfile(v: unknown): Profile {
  if (!v || typeof v !== "object") return { facts: [] };
  const o = v as Record<string, unknown>;
  if (Array.isArray(o.facts)) return { facts: mergeFacts([], o.facts) };
  const old: [string, string][] = [
    ["goals", "Her goals"],
    ["values", "What matters to her"],
    ["trusts", "Who she trusts"],
    ["fears", "What she fears"],
    ["bigDecision", "A big decision she faced"],
  ];
  return { facts: mergeFacts([], old.filter(([k]) => typeof o[k] === "string" && (o[k] as string).trim()).map(([k, label]) => `${label}: ${o[k]}`)) };
}

/** Add new facts: strings only, trimmed and clipped, no case-insensitive duplicates, newest MAX_FACTS kept. */
export function mergeFacts(facts: string[], add: unknown): string[] {
  const out = [...facts];
  const seen = new Set(out.map((f) => f.toLowerCase()));
  for (const f of Array.isArray(add) ? add : []) {
    const t = typeof f === "string" ? f.trim().slice(0, 160) : "";
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      out.push(t);
    }
  }
  return out.slice(-MAX_FACTS);
}

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
    style: "Talk like a best friend: casual, protective, a bit funny, but honest. Check how she feels. Say what you would tell her over coffee.",
  },
};

export type Outcome = "glad" | "mixed" | "regret";
export type DecisionSummary = { question: string; choice: ViewId; at: string; outcome?: Outcome };
const OUTCOME_TEXT: Record<Outcome, string> = { glad: "she is glad she did", mixed: "mixed feelings", regret: "she regrets it" };

// Appended to EVERY prompt (chat, voices, check-ins, briefs): the users are young women talking about real life, so the
// safety rule must hold no matter which voice is speaking. English only is Jayant's product call (TG 3420).
const SAFETY = `Write in English only. No Hindi or Hinglish words, even if she uses them.
If she mentions self-harm, abuse, violence, or being in danger, stop giving advice. Tell her clearly that she deserves help now, and suggest a trusted adult or a helpline (in India: 112 for emergencies, Tele-MANAS 14416 for mental health support).
Never pretend to be human. Never shame her. Never decide for her: help her decide.`;

const clip = (s: unknown, n: number) => String(s ?? "").slice(0, n);

export function profileBlock(p: Profile): string {
  if (!p.facts.length)
    return "ABOUT HER: nothing yet, you are just getting to know her. Never interview her; learn about her as she talks.";
  return "ABOUT HER (what she has told you, oldest first):\n" + p.facts.map((f) => `- ${clip(f, 160)}`).join("\n");
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
          (d.outcome ? ` (later: ${OUTCOME_TEXT[d.outcome] ?? d.outcome})` : ""),
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

// channel "telegram": the bot has a scheduler and NO commands, so the model also routes intents ("delete everything",
// "what are my reminders"...). channel "web": no reminders, no intents (the web app has buttons for those).
export type Channel = "telegram" | "web";

export function chatSystemPrompt(p: Profile, ds: DecisionSummary[], now = new Date(), channel: Channel = "telegram"): string {
  // Both channels can schedule now (bot: timer; web: in-app, shown when she opens Delulu) and both have no commands.
  const bot = channel === "telegram" || channel === "web";
  return `VOICE: ${VIEWS.sane.voice}
You are ${APP_NAME}: her AI companion, her split personality (the sane voice in her head). She can tell you anything: her day, her feelings, her plans, her drama. You listen, remember, and help her think. The joke is the name: ${APP_NAME} gives the sane answer. Playful Gen Z tone (light slang, at most one emoji), grounded advice. You remember what she told you and what she decided before. Keep replies short (under 120 words), ask one good question at a time, and connect advice to her own goals and values.

${profileBlock(p)}

${pastDecisionsBlock(ds)}

${SAFETY}

${nowLineIST(now)}

OUTPUT FORMAT: answer with ONE JSON object and nothing else:
{"reply": "<your message to her>", "decision": <null or "<one line, max 15 words: the choice she is weighing, e.g. Take the Bangalore job or stay in Jaipur>">, "reminder": <null or {"text": "<what to remind her, max 12 words>", "at": "<ISO 8601 time with +05:30>"}>, "remember": [<0 to 3 strings>]${bot ? `, "intent": <null or {"type": "...", ...}>` : ""}}
"remember": lasting facts about her from her LATEST message that are not already in ABOUT HER: her goals, values, work or studies, city, the people in her life and how she feels about them, her fears, what she likes. Third person, max 15 words each, e.g. "Works as a junior designer in Jaipur". Not passing moods, not small talk. Usually [].
Set "decision" only when her LATEST message shows a real choice she has to make (two or more options, or yes/no on something that matters). Small talk, venting with no choice, or a decision she already made: null.
${
    bot
      ? `Set "reminder" only when her LATEST message asks you to remind her of something at a time you can work out from NOW. Otherwise null. If she asks for a reminder but the time is unclear, ask her when in "reply" and set "reminder" to null.`
      : `Always set "reminder" to null: you cannot set reminders here. If she asks, tell her reminders work in the ${APP_NAME} Telegram bot.`
  }${bot ? `\n\n${INTENT_RULES}` : ""}`;
}

export type Reminder = { text: string; at: string };
export type Intent =
  | { type: "help" | "privacy" | "forget" | "checkin_off" | "reminders_list" }
  | { type: "checkin_set"; time: string }
  | { type: "reminder_cancel"; match: string }
  | { type: "decide"; question: string };
export type ChatReply = { reply: string; decision: string | null; reminder: Reminder | null; intent: Intent | null; remember: string[] };

// The Telegram bot has no slash commands: the model routes these from plain text.
const INTENT_RULES = `There are no commands. Set "intent" when her LATEST message is one of these requests, else null:
- {"type": "help"}: she asks what you can do or how this works
- {"type": "privacy"}: she asks if this is private, who can read it, or for proof that it is sealed
- {"type": "forget"}: she asks you to delete everything or forget her (the app asks her to confirm)
- {"type": "checkin_set", "time": "HH:MM"}: she wants a daily check-in at a time (24h, IST; "evening at 9" = "21:00")
- {"type": "checkin_off"}: she wants the daily check-ins to stop
- {"type": "reminders_list"}: she asks what reminders she has
- {"type": "reminder_cancel", "match": "<one or two words naming it>"}: she wants a reminder cancelled
- {"type": "decide", "question": "<one line>"}: she explicitly asks you to help her decide something
When "intent" is set, "reply" is ONE short friendly sentence; the app shows the details. Never mention commands or slashes.`;

const INTENT_TYPES = ["help", "privacy", "forget", "checkin_off", "reminders_list", "checkin_set", "reminder_cancel", "decide"];

// The model's JSON is untrusted input: only intents from the fixed list, with valid fields, get through. Anything else
// is dropped, so a hallucinated "intent" can never trigger an action the app does not define.
function readIntent(v: unknown): Intent | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const type = typeof o.type === "string" ? o.type : "";
  if (!INTENT_TYPES.includes(type)) return null;
  if (type === "checkin_set") {
    const m = String(o.time ?? "").match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    return m ? { type, time: `${m[1].padStart(2, "0")}:${m[2]}` } : null;
  }
  if (type === "reminder_cancel") {
    const match = String(o.match ?? "").trim().slice(0, 60);
    return match ? { type, match } : null;
  }
  if (type === "decide") {
    const question = String(o.question ?? "").trim().slice(0, 300);
    return question ? { type, question } : null;
  }
  return { type } as Intent;
}

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
        // The model's facts are untrusted too: at most 3 short strings per turn.
        const remember = mergeFacts([], o.remember).slice(0, 3);
        return { reply: o.reply.trim(), decision: d || null, reminder: readReminder(o.reminder, now), intent: readIntent(o.intent), remember };
      }
    } catch {}
  }
  return { reply: text, decision: null, reminder: null, intent: null, remember: [] };
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

// Stylist brief (hair) or nail tech brief (nails): what she shows at the salon. Text only; the photo never reaches 0G.
export function briefPrompt(kind: "hair" | "nails", style: string, p: Profile): string {
  const who = kind === "hair" ? "hair stylist" : "nail technician";
  return `You are ${APP_NAME}. Write a short brief she can show her ${who} for this look: "${clip(style, 120)}".
Format, plain text, max 90 words:
- 4 to 6 bullet lines, each starting with "• " (${kind === "hair" ? "cut/length, shape and layers, colour, fringe/parting, styling, upkeep" : "shape and length, base colour, design details, finish, how long it lasts, upkeep"})
- one last line starting with "Ask: " with one smart question to ask the ${who}
Practical and specific, no fluff. ${kind === "hair" ? "Mention upkeep honestly." : "Mention if it suits short or long nails."}

${profileBlock(p)}

${SAFETY}`;
}
