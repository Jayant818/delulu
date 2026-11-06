// Shared by the bot (server timer) and the web app (in-app, checked while it is open).
import type { Outcome } from "@/lib/persona";

export type Job = { id: string; kind: "checkback" | "daily" | "reminder"; at: string; ref?: string; text?: string };

export const DAY = 86_400_000;
const IST_MS = 330 * 60_000;

/** Next HH:MM in IST strictly after `now`. ponytail: IST only; add a per-user timezone when users are outside India. */
export function nextDaily(hhmm: string, now: number): number {
  const [h, m] = hhmm.split(":").map(Number);
  const ist = new Date(now + IST_MS);
  let t = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), h, m) - IST_MS;
  if (t <= now) t += DAY;
  return t;
}

export const whenIST = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) +
  " IST"; // the zone is part of the time she reads (design.md §5 Reminders)

export const OUTCOMES: { key: Outcome; label: string; reply: string }[] = [
  { key: "glad", label: "😊 Glad I did", reply: "Love that for you 💛 Noted. Remember this feeling next time you doubt yourself." },
  { key: "mixed", label: "😐 Mixed", reply: "Mixed is honest, and it's allowed. Want to talk through what's good and what isn't?" },
  { key: "regret", label: "😣 Regret it", reply: "Oof, thank you for telling me. That's not failure, it's information. Want to look at what you can still change?" },
];
