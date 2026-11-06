// Live round trip on Rabdi for a throwaway DEV wallet: seal -> sign -> verify -> write -> query -> open -> compare.
// Run (needs a funded relayer): npm run arkiv:live
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { backupMessage, openBackup, sealBackup, sha256Hex, signedBy } from "../src/lib/backup";
import { deleteBackup, findBackup, writeBackup } from "../src/lib/arkiv-server";
import { deriveKey, KEY_MESSAGE } from "../src/lib/vault";

(async () => {
  const her = privateKeyToAccount(generatePrivateKey());
  const key = await deriveKey(await her.signMessage({ message: KEY_MESSAGE }), her.address);
  const memory = { profile: { facts: ["live test fact"] }, chat: [{ role: "user", content: "live test plaintext " + Date.now() }], decisions: [], jobs: [], dailyAt: null };
  const { blob } = await sealBackup(key, memory);
  const ts = Date.now();
  const sig = await her.signMessage({ message: backupMessage(await sha256Hex(blob), ts) });
  if (!(await signedBy(her.address, backupMessage(await sha256Hex(blob), ts), sig))) throw new Error("signature check failed");
  const w = await writeBackup(her.address, blob, ts);
  console.log("WRITE", w);
  await new Promise((r) => setTimeout(r, 6000)); // 2 s blocks
  const got = await findBackup(her.address, true);
  console.log("READ", got && { key: got.key, updatedAt: got.updatedAt, expiresAt: new Date(got.expiresAt).toISOString() });
  const back = await openBackup<typeof memory>(key, new Uint8Array(Buffer.from(got!.blob!, "base64")));
  console.log("ROUND TRIP", JSON.stringify(back) === JSON.stringify(memory) ? "OK" : "MISMATCH");
  if (process.env.KEEP !== "1") console.log("DELETE", await deleteBackup(her.address));
})().catch((e) => {
  console.error("FAILED:", (e as Error).message);
  process.exit(1);
});
