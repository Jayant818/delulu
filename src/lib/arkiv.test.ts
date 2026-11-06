// Arkiv backup logic (pure): signature check, size guard, no plaintext in the blob, flag-off UI. Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { arkivLine } from "./arkiv-ui";
import { backupMessage, deleteMessage, freshTs, MAX_BLOB_BYTES, openBackup, sealBackup, sha256Hex, signedBy } from "./backup";
import { deriveKey, KEY_MESSAGE } from "./vault";

const her = privateKeyToAccount(generatePrivateKey());
const mem = (chat: { role: string; content: string }[]) => ({ profile: { facts: ["Has a cat called Mochi"] }, chat, decisions: [], jobs: [], dailyAt: null });
const keyFor = async () => deriveKey(await her.signMessage({ message: KEY_MESSAGE }), her.address);
// Incompressible filler, so the gzip step cannot hide the size.
const noise = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(36)).join("");

test("signature check: the right signer passes, a wrong signer and a changed blob fail", async () => {
  const other = privateKeyToAccount(generatePrivateKey());
  const blob = new Uint8Array([1, 2, 3]);
  const msg = backupMessage(await sha256Hex(blob), 1000);
  assert.equal(await signedBy(her.address, msg, await her.signMessage({ message: msg })), true);
  assert.equal(await signedBy(her.address, msg, await other.signMessage({ message: msg })), false, "someone else cannot write under her address");
  const msg2 = backupMessage(await sha256Hex(new Uint8Array([9])), 1000);
  assert.equal(await signedBy(her.address, msg2, await her.signMessage({ message: msg })), false, "signature of another blob");
  assert.equal(await signedBy(her.address, deleteMessage(1000), "0xdead"), false, "garbage never throws");
});

test("timestamps: stale and non-number values are refused", () => {
  assert.equal(freshTs(Date.now()), true);
  assert.equal(freshTs(Date.now() - 3_600_000), false);
  assert.equal(freshTs("now"), false);
});

test("payload never contains her words, and it round-trips with her key only", async () => {
  const secret = "I told Riya I am scared about the Pune job offer";
  const key = await keyFor();
  const { blob } = await sealBackup(key, mem([{ role: "user", content: secret }]));
  const text = Buffer.from(blob).toString("latin1") + Buffer.from(blob).toString("base64") + Buffer.from(blob).toString("hex");
  assert.ok(!text.includes(secret) && !text.includes("Mochi") && !text.includes("Pune"));
  const back = await openBackup<ReturnType<typeof mem>>(key, blob);
  assert.equal(back.chat[0].content, secret);
  const wrong = await deriveKey(await privateKeyToAccount(generatePrivateKey()).signMessage({ message: KEY_MESSAGE }), her.address);
  await assert.rejects(openBackup(wrong, blob));
});

test("size guard: an oversize memory loses its OLDEST chat and fits 128 KiB", async () => {
  const key = await keyFor();
  const chat = Array.from({ length: 40 }, (_, i) => ({ role: "user", content: `m${i} ${noise(6000)}` }));
  const { blob, trimmed } = await sealBackup(key, mem(chat));
  assert.ok(blob.length <= MAX_BLOB_BYTES);
  assert.ok(trimmed > 0);
  const back = await openBackup<ReturnType<typeof mem>>(key, blob);
  assert.equal(back.chat.at(-1)!.content.startsWith("m39 "), true, "newest message kept");
  assert.equal(back.chat.length, 40 - trimmed);
  assert.deepEqual(back.profile.facts, ["Has a cat called Mochi"], "facts never trimmed");
});

test("feature flag off: no Arkiv line, so the UI renders nothing", () => {
  assert.equal(arkivLine({ enabled: false, phase: "saved", info: { key: "0xabc", updatedAt: 1, expiresAt: 2, explorer: "x" } }), null);
  const on = arkivLine({ enabled: true, phase: "saved", info: { key: "0x1234567890abcdef", updatedAt: 1_700_000_000, expiresAt: Date.now() + 10 * 86_400_000, explorer: "https://e/x" } });
  assert.match(on!.text, /Encrypted backup on Arkiv · entity 0x1234…cdef · saved .* · expires in 10 days/);
  assert.equal(arkivLine({ enabled: true, phase: "paused", info: null })!.text.startsWith("Backup paused"), true);
});
