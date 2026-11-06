// Encrypted memory backup (Arkiv). Pure helpers shared by the browser and the server. No network here.
// The blob is: 12-byte IV + AES-256-GCM( gzip( JSON(memory) ) ). The server never gets the key or the plaintext.
import { recoverMessageAddress } from "viem";

export const SCHEMA_NAME = "delulu.memory-backup";
export const BACKUP_VERSION = 1;
// Arkiv limit: 128 KiB of `bytes` per entity.
export const MAX_BLOB_BYTES = 128 * 1024;
const MAX_SKEW_MS = 10 * 60_000;

const enc = new TextEncoder();
// Chunked: String.fromCharCode(...bytes) overflows the stack on a 128 KiB blob.
export function toB64(u: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
export const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([data as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", data as BufferSource));
  return Array.from(h, (b) => b.toString(16).padStart(2, "0")).join("");
}

// What she signs. The timestamp stops an old signed blob from being replayed over a newer backup.
export const backupMessage = (hashHex: string, ts: number) => `Delulu encrypted backup (v1)\nsha256:${hashHex}\nts:${ts}`;
export const deleteMessage = (ts: number) => `Delulu delete my backup (v1)\nts:${ts}`;

async function sealOnce(key: CryptoKey, memory: unknown): Promise<Uint8Array> {
  const zipped = await pipe(enc.encode(JSON.stringify(memory)), new CompressionStream("gzip"));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, zipped as BufferSource));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return out;
}

// Size guard: while the blob is too big, drop the oldest chat messages (never decisions or facts).
export async function sealBackup<M extends { chat: unknown[] }>(key: CryptoKey, memory: M): Promise<{ blob: Uint8Array; trimmed: number }> {
  let m = memory;
  let trimmed = 0;
  for (;;) {
    const blob = await sealOnce(key, m);
    if (blob.length <= MAX_BLOB_BYTES) return { blob, trimmed };
    if (!m.chat.length) throw new Error("backup is too big even without chat");
    const drop = Math.max(1, Math.ceil(m.chat.length / 5));
    m = { ...m, chat: m.chat.slice(drop) };
    trimmed += drop;
  }
}

export async function openBackup<T>(key: CryptoKey, blob: Uint8Array): Promise<T> {
  const iv = blob.slice(0, 12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, blob.slice(12) as BufferSource);
  const json = await pipe(new Uint8Array(pt), new DecompressionStream("gzip"));
  return JSON.parse(new TextDecoder().decode(json)) as T;
}

const lc = (s: string) => s.toLowerCase();

// Server side: does this signature prove that `owner` approved exactly this message? Never throws.
export async function signedBy(owner: string, message: string, signature: string): Promise<boolean> {
  try {
    return lc(await recoverMessageAddress({ message, signature: signature as `0x${string}` })) === lc(owner);
  } catch {
    return false;
  }
}

export const freshTs = (ts: unknown, now = Date.now()) => typeof ts === "number" && Math.abs(now - ts) <= MAX_SKEW_MS;
