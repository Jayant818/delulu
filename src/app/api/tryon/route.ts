import { NextResponse } from "next/server";
import { CAP_TOTAL, CAP_USER, editImage, IMAGE_MODEL, imageKeyConfigured, PRESETS, refund, reserve, tryonPrompt, usageKeys, withUsage, type TryonKind } from "@/lib/tryon";
import { fail, str } from "../_shared";

// Try-on. The photo stays in this request's memory only: it is sent to the image model, the result is returned to
// her browser, and both are dropped when this function returns. Nothing is written to disk except the usage COUNTS.
const MAX_BYTES = 6 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function GET() {
  return NextResponse.json({ presets: PRESETS, caps: { total: CAP_TOTAL, user: CAP_USER }, mock: !imageKeyConfigured(), model: IMAGE_MODEL });
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return fail(400, "send multipart form data");
  const kind = form.get("kind");
  const style = str(form.get("style"), 120).trim();
  const address = str(form.get("address"), 64).trim();
  const photo = form.get("image");
  if (kind !== "hair" && kind !== "nails") return fail(400, "kind must be hair or nails");
  if (!style) return fail(400, "pick or describe a style");
  if (!(photo instanceof Blob) || !TYPES.includes(photo.type)) return fail(400, "photo must be a JPEG, PNG or WebP image");
  if (photo.size > MAX_BYTES) return fail(413, "photo is too big (max 6 MB)");

  // No key: MOCK. The photo comes straight back, labelled, and nothing is spent.
  if (!imageKeyConfigured()) {
    const dataUrl = `data:${photo.type};base64,${Buffer.from(await photo.arrayBuffer()).toString("base64")}`;
    return NextResponse.json({ image: dataUrl, mock: true, model: "mock", ms: 0 });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const keys = usageKeys(address || "anonymous", ip);
  const blocked = await withUsage<string | null>((u) => {
    const out = reserve(u, keys, Date.now());
    return out.ok ? { usage: out.usage, result: null } : { usage: u, result: out.reason };
  });
  if (blocked) return fail(429, blocked);

  try {
    const { dataUrl, ms } = await editImage(photo, tryonPrompt(kind as TryonKind, style));
    return NextResponse.json({ image: dataUrl, mock: false, model: IMAGE_MODEL, ms });
  } catch (e) {
    await withUsage((u) => ({ usage: refund(u, keys), result: null })); // failed call: nothing was spent
    console.error("[tryon]", (e as Error).message); // never the photo or the prompt
    return fail(502, "The image model didn't answer. Try again in a minute?");
  }
}
