// Server-only: hair + nail try-on via the image model (0G by default), with a hard spend cap (Jayant's money).
// Privacy: the uploaded photo and the result live only in this request's memory; nothing is written to disk.
// Only usage COUNTS are persisted (per day, keyed by an HMAC, never a raw wallet address or IP).
import { createHmac } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export type TryonKind = "hair" | "nails";

export const PRESETS: Record<TryonKind, string[]> = {
  hair: ["Curtain bangs with long layers", "Sleek chin-length bob", "Soft beachy waves", "Copper red, same cut", "Short pixie cut", "Glossy dark brown balayage"],
  nails: ["Milky pink French tips", "Glazed chrome", "Deep cherry red", "Minimal nude, short square", "Pastel ombré", "Tiny white florals"],
};

export function tryonPrompt(kind: TryonKind, style: string): string {
  return kind === "hair"
    ? `Edit this photo: give her a CLEARLY VISIBLE new hairstyle: ${style}. The change must be obvious at first glance (cut, length, fringe or color exactly as described). Keep her face, identity, skin tone and expression the same. Photorealistic, natural hairline, realistic hair texture.`
    : `Edit this photo of a hand: give the nails a CLEARLY VISIBLE new manicure: ${style}. The change must be obvious at first glance (color, shape and finish exactly as described). Keep the hand, fingers, skin, pose and background the same. Photorealistic salon manicure.`;
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
// Vercel's file system is read-only except /tmp, so the counts go there (VERCEL=1 is set by the platform).
// ponytail: on Vercel each function instance has its own /tmp, so the caps hold per instance, not globally. Upgrade
// path: keep the counts in Vercel KV / Upstash Redis (one INCR per try-on) if a real global cap matters.
const usageFile = () =>
  process.env.TRYON_USAGE_FILE ??
  (process.env.VERCEL ? path.join(tmpdir(), "delulu-tryon-usage.json") : path.join(/* turbopackIgnore: true */ process.cwd(), "data", "tryon-usage.json"));
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
// Default: 0G (Jayant, TG 3443). Measured 2026-11-06 on 0G: bytedance/seedream-5.0-flash edits a hair photo in ~17 s and
// nails in ~14 s, $0.027 per image, keeping the face/hand; tencent/hy-image-3.5-preview was slower (~24 s). Both are
// STANDARD tier (no TeeML image-edit model exists on 0G; responses carry x-0g-e2ee: none), so try-on is NOT sealed.
// No silent cross-provider fallback: the copy she reads names ONE provider, so the photo only ever goes there.
export type ImageBackend = "0g" | "openai" | "mock";

export function imageBackend(): ImageBackend {
  const want = process.env.TRYON_BACKEND?.trim();
  if (want === "openai") return process.env.OPENAI_API_KEY?.trim() ? "openai" : "mock";
  if (process.env.ZG_API_KEY?.trim()) return "0g";
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  return "mock";
}

export const ZG_IMAGE_MODEL = process.env.ZG_IMAGE_MODEL ?? "bytedance/seedream-5.0-flash";
export const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2.5-sunburst";
export const imageModel = () => (imageBackend() === "0g" ? ZG_IMAGE_MODEL : imageBackend() === "openai" ? OPENAI_IMAGE_MODEL : "mock");
/** @deprecated kept for the live check; use imageModel() */
export const IMAGE_MODEL = OPENAI_IMAGE_MODEL;
const SIZE = process.env.TRYON_IMAGE_SIZE ?? process.env.OPENAI_IMAGE_SIZE ?? "1024x1024";
const QUALITY = process.env.OPENAI_IMAGE_QUALITY ?? "medium";

export const imageKeyConfigured = () => imageBackend() !== "mock";

export type EditResult = { dataUrl: string; ms: number; requestId: string | null; backend: ImageBackend; model: string };

export async function editImage(photo: Blob, prompt: string): Promise<EditResult> {
  return imageBackend() === "0g" ? edit0g(photo, prompt) : editOpenAI(photo, prompt);
}

/** 0G: /v1/images/generations with the photo as a reference image (data URL). Sync; ~15-25 s. */
async function edit0g(photo: Blob, prompt: string): Promise<EditResult> {
  const t = Date.now();
  const ref = `data:${photo.type || "image/jpeg"};base64,${Buffer.from(await photo.arrayBuffer()).toString("base64")}`;
  const res = await fetch(`${process.env.ZG_BASE_URL ?? "https://router-api.0g.ai/v1"}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.ZG_API_KEY}` },
    body: JSON.stringify({ model: ZG_IMAGE_MODEL, prompt, image: [ref], size: SIZE, n: 1, response_format: "b64_json" }),
    signal: AbortSignal.timeout(55_000), // under the route's 60 s maxDuration: a slow call ends as our 502 + refund
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`0G image model ${res.status}: ${body.slice(0, 300)}`);
  const j = JSON.parse(body);
  const b64 = j?.data?.[0]?.b64_json;
  if (!b64) throw new Error("0G image model returned no image");
  // seedream returns JPEG (measured: 1024x1024, ~300 KB, far under Vercel's 4.5 MB response limit); label it by its bytes.
  const mime = b64.startsWith("/9j/") ? "image/jpeg" : "image/png";
  return { dataUrl: `data:${mime};base64,${b64}`, ms: Date.now() - t, requestId: j?.x_0g_trace?.request_id ?? null, backend: "0g", model: ZG_IMAGE_MODEL };
}

/** OpenAI (only if chosen): /v1/images/edits. Never sends input_fidelity: this model rejects it (400). */
async function editOpenAI(photo: Blob, prompt: string): Promise<EditResult> {
  const t = Date.now();
  const form = new FormData();
  form.set("model", OPENAI_IMAGE_MODEL);
  form.set("prompt", prompt);
  form.set("size", SIZE);
  form.set("quality", QUALITY);
  form.set("n", "1");
  form.set("image", photo, "photo.jpg");
  const res = await fetch(`${process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(55_000), // under the route's 60 s maxDuration: a slow call ends as our 502 + refund
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`image model ${res.status}: ${body.slice(0, 300)}`);
  const b64 = JSON.parse(body)?.data?.[0]?.b64_json;
  if (!b64) throw new Error("image model returned no image");
  return { dataUrl: `data:image/png;base64,${b64}`, ms: Date.now() - t, requestId: null, backend: "openai", model: OPENAI_IMAGE_MODEL };
}

/** What she is told, per backend. Must stay exactly true. */
export function tryonPrivacyLine(b: ImageBackend): string {
  if (b === "openai") return "Your chats are sealed on 0G. Try-on photos go to OpenAI's image model to make your look, then we delete them.";
  return "Your chats are sealed on 0G. Try-on photos are processed by an image model on 0G's network (standard tier, not sealed), then deleted.";
}
