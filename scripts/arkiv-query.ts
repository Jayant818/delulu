// The one query: list every Delulu backup entity on Arkiv Rabdi written by our relayer. No keys needed (public RPC).
// Run: npm run arkiv:query   (set ARKIV_ACCESS_KEY to avoid the rate limit)
import { createPublicClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { http } from "viem";
import { Backup } from "../src/lib/arkiv-server";

const RELAYER = "0xB681D7d03b055EF0Ed26766fB21b0c1ff6520C54";

(async () => {
  const client = createPublicClient({ chain: rabdi({ accessKey: process.env.ARKIV_ACCESS_KEY ?? "" }), transport: http() });
  const { entities } = await client.select({ $key: true, $expiresAt: true, user: true, updatedAt: true, version: true }).from(Backup).createdBy(RELAYER).limit(100).fetch();
  console.log(`${entities.length} Delulu backup entities (schema ${Backup.name ?? "delulu.memory-backup"})`);
  for (const e of entities) console.log(e.$key, "user", e.user.value, "version", e.version.value, "updatedAt", new Date(Number(e.updatedAt.value) * 1000).toISOString());
})();
