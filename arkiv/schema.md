# Schema

One entity per user. Schema name: `delulu.memory-backup` (the SDK stores it in the indexed `arkiv.schema` attribute, so this is our app tag).

| Column | Type | Indexed | Meaning |
| --- | --- | --- | --- |
| `user` | `addr` | yes | Her wallet address (embedded Privy wallet, or a DEV key) |
| `version` | `i32` | yes | Backup format version, now `1` |
| `updatedAt` | `u64` | yes | Unix milliseconds of her last save (the signed `ts`). Used as a replay guard |
| `blob` | `bytes` | no | 12-byte IV + AES-256-GCM ciphertext of the gzip of her memory JSON |

Entity fields we rely on: `$creator` and `$owner` are always the relayer wallet `0xB681D7d03b055EF0Ed26766fB21b0c1ff6520C54`. `$expiresAt` gives the expiry block.

## Trust

Anyone can write an entity with our schema name. The app reads only entities where `$creator` is the relayer AND `user` is her address. The relayer writes only after it checks her signature (see `how-you-use-arkiv.md`).

## Expiration

Every create and every save calls `ExpirationTime.max()` (7,884,000 blocks, about 182.5 days). A save renews it with `extendEntity`. A backup she stops renewing expires on its own.

## Size guard

Arkiv allows 128 KiB of `bytes` per entity. The browser gzips her memory before it encrypts. If the result is still over 128 KiB, it drops the oldest chat messages (20% at a time) until it fits. Facts and decisions are never dropped. The server rejects any blob over 128 KiB with HTTP 413.

## Never on Arkiv

No plaintext, no message text, no profile facts. A unit test (`src/lib/arkiv.test.ts`) checks that a known plaintext string does not appear in the blob (raw, base64 or hex).

## What is public

The blob (locked), her wallet address, the `updatedAt` time, the entity key, and the on-chain transaction history. Arkiv is a public network.

## Known limits (honest)

- **Replay window.** A signed POST or DELETE is accepted only if its `ts` is within 10 minutes of the server clock and strictly newer than the stored `updatedAt`. The server also remembers the last `ts` per owner in process memory, which stops a replayed POST after a delete and a replayed DELETE. That memory is per instance and lost on restart, so a captured request can be replayed inside the 10-minute window against another instance or after a restart.
- **One entity per user is enforced per process only.** Writes are serialised in one server process. Two instances racing a first save can create two entities. Reads take the newest one; "Delete everything" deletes all of them. A shared lock would fix this.
- **Reads have no auth.** `GET /api/arkiv/backup?owner=<address>` returns the locked blob to anyone who knows the address. This is by design: the data is already public on Arkiv, and it is AES-256-GCM ciphertext that only her wallet-derived key opens. Anyone can also see the wallet address and the save times. The Settings card says so.
