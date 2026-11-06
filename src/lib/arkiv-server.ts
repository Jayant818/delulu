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
  updatedAt: u64().indexed(), // unix seconds
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
export async function findBackup(owner: string, withBlob: boolean): Promise<BackupInfo | null> {
  const { pub, account } = clients();
  const base = { $key: true, $expiresAt: true, updatedAt: true } as const;
  const q = withBlob ? pub.select({ ...base, blob: true }) : pub.select(base);
  const { entities } = await q
    .from(Backup)
    .createdBy(account.address)
    .where(eq("user", addr(owner as Hex)))
    .limit(1)
    .fetch();
  const e = entities[0] as (typeof entities)[number] & { blob?: { value: Hex } };
  if (!e) return null;
  const { currentBlock } = await pub.getBlockTiming();
  const hex = e.blob?.value;
  return {
    key: e.$key,
    updatedAt: Number(e.updatedAt.value),
    expiresAt: Date.now() + Number(e.$expiresAt - currentBlock) * BLOCK_SECONDS * 1000,
    ...(hex ? { blob: Buffer.from(hex.slice(2), "hex").toString("base64") } : {}),
    explorer: explorerUrl(e.$key),
  };
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
    // Replay guard: a signed message older than the stored backup is refused.
    if (old && ts / 1000 < old.updatedAt) throw new Error("stale backup");
    const values = { user: addr(owner as Hex), version: BACKUP_VERSION, updatedAt: u64(Math.floor(ts / 1000)), blob };
    if (!old) {
      const { entityKey, txHash } = await wallet.createEntity(Backup, values, { expiration: ExpirationTime.max() });
      return { key: entityKey as string, txHash: txHash as string, explorer: explorerUrl(entityKey) };
    }
    const key = old.key as Hex;
    const { txHash } = await wallet.patchEntity(Backup, key, { set: { version: BACKUP_VERSION, updatedAt: u64(Math.floor(ts / 1000)), blob } });
    await wallet.extendEntity({ entityKey: key, expiration: ExpirationTime.max() }); // renew on every save
    return { key, txHash: txHash as string, explorer: explorerUrl(key) };
  });
}

export function deleteBackup(owner: string) {
  return serial(async () => {
    const old = await findBackup(owner, false);
    if (!old) return false;
    await clients().wallet.deleteEntity({ entityKey: old.key as Hex });
    return true;
  });
}
