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

export type DecisionSummary = { question: string; choice: ViewId; at: string };

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
      .map((d) => `- ${clip(d.at, 10)}: "${clip(d.question, 200)}" -> she went with ${VIEWS[d.choice]?.title ?? d.choice}`)
      .join("\n")
  );
}

export type ChatLine = { role: "user" | "assistant"; content: string };

function recentChatBlock(lines: ChatLine[]): string {
  if (!lines.length) return "RECENT CHAT: none yet.";
  return "RECENT CHAT (oldest first):\n" + lines.slice(-10).map((l) => `- ${l.role === "user" ? "Her" : APP_NAME}: ${clip(l.content, 300)}`).join("\n");
}

// Chat replies are JSON so a decision hidden in free talk can be pulled out into the 3-voice Decide screen.
export function chatSystemPrompt(p: Profile, ds: DecisionSummary[]): string {
  return `VOICE: ${VIEWS.sane.voice}
You are ${APP_NAME}, a private AI companion. She can tell you anything: her day, her feelings, her plans, her drama. You listen, remember, and help her think. The joke is the name: ${APP_NAME} gives the sane answer. Playful Gen Z tone (light slang, at most one emoji), grounded advice. You remember what she told you and what she decided before. Keep replies short (under 120 words), ask one good question at a time, and connect advice to her own goals and values.

${profileBlock(p)}

${pastDecisionsBlock(ds)}

${SAFETY}

OUTPUT FORMAT: answer with ONE JSON object and nothing else:
{"reply": "<your message to her>", "decision": <null or "<one line, max 15 words: the choice she is weighing, e.g. Take the Bangalore job or stay in Jaipur>">}
Set "decision" only when her LATEST message shows a real choice she has to make (two or more options, or yes/no on something that matters). Small talk, venting with no choice, or a decision she already made: null.`;
}

// Tolerant parser: plain JSON, JSON inside a code fence, or prose with a JSON object in it.
// Anything unparseable becomes a plain reply with no decision, so chat never breaks on a format slip.
export function parseChatReply(raw: string): { reply: string; decision: string | null } {
  const text = String(raw ?? "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const o = JSON.parse(text.slice(start, end + 1));
      if (o && typeof o.reply === "string" && o.reply.trim()) {
        const d = typeof o.decision === "string" ? o.decision.trim().slice(0, 160) : "";
        return { reply: o.reply.trim(), decision: d || null };
      }
    } catch {}
  }
  return { reply: text, decision: null };
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
