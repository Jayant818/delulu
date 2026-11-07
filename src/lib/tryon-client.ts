import type { ImageBackend, TryonKind } from "./tryon";

export type TryonInfo = { presets: Record<TryonKind, string[]>; caps: { total: number; user: number }; mock: boolean; backend: ImageBackend; model: string };
export type TryonResult = { image: string; mock: boolean; ms: number; backend: ImageBackend; model: string; requestId: string | null };

/** Shrink on the device before upload; never persist either image. */
export async function shrink(file: File, max = 1024): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * s));
  c.height = Math.max(1, Math.round(bmp.height * s));
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("could not read the photo"))), "image/jpeg", 0.9));
}

export function photoConsent(backend: ImageBackend, action = "See it on me"): string {
  if (backend === "mock") return `Tapping “${action}” allows this photo to be sent to our server. No image model is set up (MOCK): it comes back unchanged and is never saved.`;
  const model = backend === "openai"
    ? "OpenAI's image model (not 0G, not sealed)"
    : "an image model on 0G (standard tier, not the sealed mode your chats use)";
  return `Tapping “${action}” allows this photo to be sent to ${model} to make your look. It is deleted right after; we never save it.`;
}
