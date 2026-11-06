// Server-only: hair + nail try-on via OpenAI's image edit endpoint, with a hard spend cap (Jayant's money).
// Privacy: the uploaded photo and the result live only in this request's memory; nothing is written to disk.
// Only usage COUNTS are persisted (per day, keyed by an HMAC, never a raw wallet address or IP).
import { createHmac } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type TryonKind = "hair" | "nails";

export const PRESETS: Record<TryonKind, string[]> = {
  hair: ["Curtain bangs with long layers", "Sleek chin-length bob", "Soft beachy waves", "Copper red, same cut", "Short pixie cut", "Glossy dark brown balayage"],
  nails: ["Milky pink French tips", "Glazed chrome", "Deep cherry red", "Minimal nude, short square", "Pastel ombré", "Tiny white florals"],
};

export function tryonPrompt(kind: TryonKind, style: string): string {
  return kind === "hair"
    ? `Edit this photo: change ONLY her hairstyle to: ${style}. Keep her face, identity, skin, expression, clothes, background and lighting exactly the same. Photorealistic, natural hairline, realistic hair texture.`
    : `Edit this photo of a hand: paint the nails with: ${style}. Keep the hand, fingers, skin, pose, jewellery and background exactly the same. Photorealistic salon manicure.`;
}

// ---- Spend cap --------------------------------------------------------------------------------------
export const CAP_TOTAL = Number(process.env.TRYON_CAP_TOTAL ?? 40); // images per day, all users together
export const CAP_USER = Number(process.env.TRYON_CAP_USER ?? 5); // images per day, per user (wallet AND ip)

export type Usage = { day: string; total: number; by: Record<string, number> };
const dayIST = (now: number) => new Date(now + 330 * 60_000).toISOString().slice(0, 10);

/** Pure: may this request spend one image? If yes, returns the usage with the reservation applied. */
export function reserve(u: Usage, keys: string[], now: number): { ok: true; usage: Usage } | { ok: false; reason: string } {
  const fresh: Usage = u.day === dayIST(now) ? u : { day: dayIST(now), total: 0, by: {} };
  if (fresh.total >= CAP_TOTAL) return { ok: false, reason: `Today's try-on limit for everyone (${CAP_TOTAL}) is used up. Back tomorrow!` };
  if (keys.some((k) => (fresh.by[k] ?? 0) >= CAP_USER)) return { ok: false, reason: `You've used your ${CAP_USER} try-ons for today. Back tomorrow!` };
  const by = { ...fresh.by };
  for (const k of keys) by[k] = (by[k] ?? 0) + 1;
  return { ok: true, usage: { day: fresh.day, total: fresh.total + 1, by } };
}

/** Pure: give a reservation back (the image call failed, so nothing was spent). */
export function refund(u: Usage, keys: string[]): Usage {
  const by = { ...u.by };
  for (const k of keys) by[k] = Math.max(0, (by[k] ?? 1) - 1);
  return { ...u, total: Math.max(0, u.total - 1), by };
}

// turbopackIgnore: a runtime data file, not a source to trace into the server bundle.
const usageFile = () => process.env.TRYON_USAGE_FILE ?? path.join(/* turbopackIgnore: true */ process.cwd(), "data", "tryon-usage.json");
let lock: Promise<unknown> = Promise.resolve();

/** Serialised read-modify-write of the usage file (one Node process). */
export function withUsage<T>(fn: (u: Usage) => { usage: Usage; result: T }): Promise<T> {
  const run = lock.then(async () => {
    let u: Usage = { day: "", total: 0, by: {} };
    try {
      u = JSON.parse(await readFile(usageFile(), "utf8"));
    } catch {}
    const { usage, result } = fn(u);
    await mkdir(path.dirname(usageFile()), { recursive: true });
    const tmp = `${usageFile()}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(usage));
    await rename(tmp, usageFile());
    return result;
  });
  lock = run.catch(() => {});
  return run;
}

/** Usage keys: HMACs of the wallet address and the client IP, so the counts file holds no raw identifiers. */
export function usageKeys(address: string, ip: string): string[] {
  const secret = process.env.TRYON_SALT || process.env.BOT_MASTER_KEY || "delulu-tryon";
  const h = (s: string) => createHmac("sha256", secret).update(s).digest("hex").slice(0, 16);
  return [`a:${h(address.toLowerCase())}`, `i:${h(ip)}`];
}

// ---- Image call -------------------------------------------------------------------------------------
export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2.5-sunburst";
const SIZE = process.env.OPENAI_IMAGE_SIZE ?? "1024x1024";
const QUALITY = process.env.OPENAI_IMAGE_QUALITY ?? "medium";

export const imageKeyConfigured = () => !!process.env.OPENAI_API_KEY?.trim();

/** Returns a PNG/JPEG as a data URL. Never sends input_fidelity: this model rejects it (400 invalid_input_fidelity_model). */
export async function editImage(photo: Blob, prompt: string): Promise<{ dataUrl: string; ms: number }> {
  const t = Date.now();
  const form = new FormData();
  form.set("model", IMAGE_MODEL);
  form.set("prompt", prompt);
  form.set("size", SIZE);
  form.set("quality", QUALITY);
  form.set("n", "1");
  form.set("image", photo, "photo.jpg");
  const res = await fetch(`${process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(150_000),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`image model ${res.status}: ${body.slice(0, 300)}`);
  const b64 = JSON.parse(body)?.data?.[0]?.b64_json;
  if (!b64) throw new Error("image model returned no image");
  return { dataUrl: `data:image/png;base64,${b64}`, ms: Date.now() - t };
}
