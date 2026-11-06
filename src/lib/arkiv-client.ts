// Browser side of the Arkiv backup: seal -> sign -> POST, and GET -> open. Talks to /api/arkiv/backup only.
import { backupMessage, deleteMessage, fromB64, openBackup, sealBackup, sha256Hex, toB64 } from "./backup";

export type ArkivInfo = { key: string; updatedAt: number; expiresAt: number; explorer: string };
type Sign = (message: string) => Promise<string>;

async function call(method: string, url: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export const arkivApi = {
  read: (owner: string): Promise<{ enabled: boolean; backup: (ArkivInfo & { blob?: string }) | null }> => call("GET", `/api/arkiv/backup?owner=${owner}`),

  async save(key: CryptoKey, memory: { chat: unknown[] }, owner: string, sign: Sign) {
    const { blob, trimmed } = await sealBackup(key, memory);
    const ts = Date.now();
    const signature = await sign(backupMessage(await sha256Hex(blob), ts));
    const r = await call("POST", "/api/arkiv/backup", { owner, blob: toB64(blob), signature, ts });
    // The write response has no expiry; it was just renewed to the maximum (~182 days).
    return { trimmed, info: { key: r.key, explorer: r.explorer, updatedAt: Math.floor(ts / 1000), expiresAt: ts + 182 * 86_400_000 } as ArkivInfo };
  },

  async fetchMemory<T>(key: CryptoKey, owner: string): Promise<T> {
    const r = await arkivApi.read(owner);
    if (!r.backup?.blob) throw new Error("No backup found on Arkiv.");
    try {
      return await openBackup<T>(key, fromB64(r.backup.blob));
    } catch {
      throw new Error("This backup was made with a different key. It cannot be opened here.");
    }
  },

  async remove(owner: string, sign: Sign) {
    const ts = Date.now();
    await call("DELETE", "/api/arkiv/backup", { owner, ts, signature: await sign(deleteMessage(ts)) });
  },
};
