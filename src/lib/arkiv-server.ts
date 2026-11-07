// Server side of the Arkiv backup. The relayer wallet pays for and owns every entity; she proves ownership by signature.
// The server only ever handles ciphertext.
import { createPublicClient, createWalletClient, ExpirationTime } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { eq } from "@arkiv-network/sdk/query";
import { addr, bytes, defineSchema, i32, u64 } from "@arkiv-network/sdk/schema";
import { http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { BACKUP_VERSION, MAX_BLOB_BYTES, SCHEMA_NAME } from "./backup";

export const Backup = defineSchema(SCHEMA_NAME, {
  user: addr().indexed(),
  version: i32().indexed(),
  updatedAt: u64().indexed(), // unix milliseconds (the signed ts)
  blob: bytes(), // nonce + AES-GCM ciphertext. Never plaintext.
});

const BLOCK_SECONDS = 2;
export const EXPLORER = "https://rabdi.explorer.arkiv.network";
export const explorerUrl = (key: string) => `${EXPLORER}/entity/${key}`;

const pk = () => process.env.ARKIV_RELAYER_PRIVATE_KEY?.trim();
// Feature flag: no relayer key, no Arkiv. The UI hides itself and the app runs as before.
export const arkivEnabled = () => !!pk();

function clients() {
  const chain = rabdi({ accessKey: process.env.ARKIV_ACCESS_KEY?.trim() ?? "" });
  const account = privateKeyToAccount(pk() as Hex);
  return {
    account,
    pub: createPublicClient({ chain, transport: http() }),
    wallet: createWalletClient({ chain, transport: http(), account }),
  };
}

export type BackupInfo = { key: string; updatedAt: number; expiresAt: number; blob?: string; explorer: string };

// Only entities the relayer created count: anyone can write entities with our schema name.
// More than one per owner can exist (two server instances racing a first save): we read the newest, and delete all.
async function findAll(owner: string, withBlob: boolean): Promise<BackupInfo[]> {
  const { pub, account } = clients();
  const base = { $key: true, $expiresAt: true, updatedAt: true } as const;
  const q = withBlob ? pub.select({ ...base, blob: true }) : pub.select(base);
  const { entities } = await q
    .from(Backup)
    .createdBy(account.address)
    .where(eq("user", addr(owner as Hex)))
    .limit(20)
    .fetch();
  if (!entities.length) return [];
  const { currentBlock } = await pub.getBlockTiming();
  return entities
    .map((e0) => {
      const e = e0 as typeof e0 & { blob?: { value: Hex } };
      const hex = e.blob?.value;
      return {
        key: e.$key as string,
        updatedAt: Number(e.updatedAt.value),
        expiresAt: Date.now() + Number(e.$expiresAt - currentBlock) * BLOCK_SECONDS * 1000,
        ...(hex ? { blob: Buffer.from(hex.slice(2), "hex").toString("base64") } : {}),
        explorer: explorerUrl(e.$key),
      };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export const findBackup = async (owner: string, withBlob: boolean): Promise<BackupInfo | null> => (await findAll(owner, withBlob))[0] ?? null;

// Replay guard: a signed POST or DELETE is accepted only if its ts is strictly newer than the stored backup AND the last
// ts this process saw for the owner (so a replayed POST after a delete, or a replayed DELETE, is refused).
// ponytail: last-seen lives in process memory, so it is per instance and lost on restart. The 10-minute ts window then
// bounds a replay. Upgrade: store a tombstone/nonce in Arkiv or a shared KV.
const lastSeen = new Map<string, number>();
function guard(owner: string, ts: number, stored: number) {
  const k = owner.toLowerCase();
  if (ts <= Math.max(stored, lastSeen.get(k) ?? 0)) throw new Error("stale backup");
  lastSeen.set(k, ts);
}

// One write at a time: the relayer has one nonce, and two parallel "create" calls would make two entities for one user.
let chain: Promise<unknown> = Promise.resolve();
const serial = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
};

export function writeBackup(owner: string, blob: Uint8Array, ts: number) {
  if (blob.length > MAX_BLOB_BYTES) throw new Error("blob too big");
  return serial(async () => {
    const { wallet } = clients();
    const old = await findBackup(owner, false);
    guard(owner, ts, old?.updatedAt ?? 0);
    const values = { user: addr(owner as Hex), version: BACKUP_VERSION, updatedAt: u64(ts), blob };
    if (!old) {
      const { entityKey, txHash } = await wallet.createEntity(Backup, values, { expiration: ExpirationTime.max() });
      return { key: entityKey as string, txHash: txHash as string, explorer: explorerUrl(entityKey) };
    }
    const key = old.key as Hex;
    const { txHash } = await wallet.patchEntity(Backup, key, { set: { version: BACKUP_VERSION, updatedAt: u64(ts), blob } });
    await wallet.extendEntity({ entityKey: key, expiration: ExpirationTime.max() }); // renew on every save
    return { key, txHash: txHash as string, explorer: explorerUrl(key) };
  });
}

export function deleteBackup(owner: string, ts: number) {
  return serial(async () => {
    const all = await findAll(owner, false);
    guard(owner, ts, all[0]?.updatedAt ?? 0);
    for (const e of all) await clients().wallet.deleteEntity({ entityKey: e.key as Hex });
    return all.length > 0;
  });
}
