# How Delulu uses Arkiv

Network: Rabdi (chain 7794095), SDK `@arkiv-network/sdk` 1.0.1. Feature: **encrypted memory backup, restore on a new device**.

## Write path

1. She talks to Delulu. Memory changes locally (AES-GCM ciphertext in IndexedDB, as before).
2. After 6 seconds of quiet, the browser builds the backup: gzip, then AES-256-GCM with her wallet-derived key (non-extractable WebCrypto key). Oldest chat is trimmed if over 128 KiB.
3. She signs `Delulu encrypted backup (v1) / sha256:<hash of the blob> / ts:<unix ms>` with her wallet. This is a plain message signature: free, no transaction, silent with a Privy embedded wallet.
4. `POST /api/arkiv/backup` sends blob (base64), her address, the signature and `ts`.
5. The server checks: `ts` is within 10 minutes, the blob is at most 128 KiB, and the signature recovers exactly her address for exactly this blob hash. Otherwise 401.
6. The relayer wallet writes one entity per user. First save: `createEntity`. Later saves: `patchEntity` of `blob`, `version`, `updatedAt`, then `extendEntity` to renew the expiry. A signed message whose `ts` is not strictly newer than the stored `updatedAt` (or the last `ts` seen for her) is refused (409), so an old blob cannot overwrite a newer one.
7. Writes run one at a time on the server (one relayer nonce, no duplicate entities).

The server sees only ciphertext. It never has her key.

## Read path (the user-visible feature)

`GET /api/arkiv/backup?owner=<address>` runs this SDK query on Arkiv:

```ts
publicClient.select({ $key: true, $expiresAt: true, updatedAt: true, blob: true })
  .from(Backup).createdBy(relayer).where(eq("user", addr(owner))).limit(1).fetch()
```

The app shows in Settings: "Encrypted backup on Arkiv · entity 0x… · saved <time> · expires in N days", a link to the explorer, and a **Restore from Arkiv** button. Restore fetches the blob, decrypts it in the browser with her key, replaces local memory and re-encrypts it locally.

Saving is held (nothing is uploaded) while Arkiv has a backup and this device is empty, until she restores or chooses "replace the backup", so a new device never overwrites the only copy.

On unlock with empty local memory, the app queries Arkiv and offers to restore (a banner above every screen). The same read also tells the app whether Arkiv is on.

## Delete

"Delete everything" signs `Delulu delete my backup (v1) / ts:<unix ms>`. The relayer then calls `deleteEntity` for every entity of hers. The app always tries this, even if the first Arkiv read failed. It waits for any save in flight first, and blocks new saves. If the delete fails, the app stops before it erases anything and says so, with a retry. If that call fails (Arkiv down), the entity is no longer renewed and expires within about 182 days. The transaction history on the chain stays public.

## Relayer

One server-side wallet, `0xB681D7d03b055EF0Ed26766fB21b0c1ff6520C54`, pays gas (tGLM) and owns every entity. Env: `ARKIV_RELAYER_PRIVATE_KEY` (required to turn the feature on), `ARKIV_ACCESS_KEY` (optional; without it the rate-limited public RPC is used). With no relayer key the Arkiv UI is hidden and the app behaves as before.

## Errors

If Arkiv or the relayer fails, chat, decide, try-on and reminders keep working. The card shows "Backup paused" with a Retry button.

## Code

`src/lib/backup.ts` (crypto, size guard, signature check), `src/lib/arkiv-server.ts` (SDK calls), `src/app/api/arkiv/backup/route.ts`, `src/lib/arkiv-client.ts`, `src/components/ArkivBackup.tsx`, `src/lib/memory.tsx` (debounce, restore, wipe).
