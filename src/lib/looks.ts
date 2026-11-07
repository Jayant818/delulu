// After her photo: three try-on ideas that fit the chat (Jayant TG 3761), written by the same sealed 0G model.
// Only what the try-on can do today: hair (cut, style, color) and nails. No clothes: if she talks outfits, the ideas
// are hair and nails that go with it.
import { profileBlock, type ChatLine, type Profile } from "@/lib/persona";
import type { TryonKind } from "@/lib/tryon";

export type Look = { kind: TryonKind; label: string; prompt: string };

// MOCK (no model configured) and the E2E use these; labels say MOCK so a demo can never pass them off as AI ideas.
export const MOCK_LOOKS: Look[] = [
  { kind: "hair", label: "Mock idea · soft waves", prompt: "Loose soft waves, same length" },
  { kind: "nails", label: "Mock idea · red tips", prompt: "Glossy cherry red, short almond" },
  { kind: "hair", label: "Mock idea · copper", prompt: "Copper red, same cut" },
];

export function looksPrompt(p: Profile, history: ChatLine[]): string {
  const chat = history.map((l) => `${l.role === "user" ? "Her" : "Delulu"}: ${l.content.slice(0, 300)}`).join("\n") || "(no chat yet)";
  return `She just sent a photo of herself to try a new look. The app can ONLY change her hair (cut, style, color) or her nails. It cannot change clothes, makeup or the background.
Read the chat and suggest exactly 3 looks that fit what she is talking about: the occasion, her outfit, her vibe. If she talks about an outfit, suggest hair and nails that go with it. Mix hair and nails when it fits.

${profileBlock(p)}

THE CHAT (newest last):
${chat}

Answer with ONE JSON object and nothing else:
{"looks": [{"kind": "hair" or "nails", "label": "<max 5 words, specific to her, e.g. Soft waves for the rooftop>", "prompt": "<max 100 characters: the exact look to make, e.g. Loose soft waves, long length, glossy finish>"}]}`;
}

/** The model's JSON is untrusted: only hair / nails ideas with short text get through; null when nothing usable. */
export function parseLooks(raw: string): Look[] | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  let o: unknown;
  try {
    o = JSON.parse(m[0]);
  } catch {
    return null;
  }
  const list = (o as { looks?: unknown })?.looks;
  if (!Array.isArray(list)) return null;
  const looks = list
    .map((l) => l as Record<string, unknown>)
    .filter((l) => (l.kind === "hair" || l.kind === "nails") && typeof l.label === "string" && typeof l.prompt === "string")
    .map((l) => ({ kind: l.kind as TryonKind, label: String(l.label).trim().slice(0, 40), prompt: String(l.prompt).trim().slice(0, 120) }))
    .filter((l) => l.label && l.prompt)
    .slice(0, 3);
  return looks.length ? looks : null;
}
