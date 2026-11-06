// Run: npm test. Checks the two pieces that fail silently if wrong: the memory crypto and 0G response parsing.
import assert from "node:assert/strict";
import { test } from "node:test";
import { privateKeyToAccount } from "viem/accounts";
import { APP_NAME } from "../config";
import { complete, configuredBackends, parse0g } from "./ai/provider";
import { stripQuery } from "./analytics";
import { MAX_FACTS, mergeFacts, normalizeProfile, parseChatReply } from "./persona";
import { deriveKey, KEY_MESSAGE, seal, unseal } from "./vault";

const alice = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const bob = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");

test("same wallet -> same key: memory survives a reload", async () => {
  const sig1 = await alice.signMessage({ message: KEY_MESSAGE });
  const sig2 = await alice.signMessage({ message: KEY_MESSAGE });
  assert.equal(sig1, sig2, "signature must be deterministic (RFC 6979) or the key changes every login");
  const sealed = await seal(await deriveKey(sig1, alice.address), { secret: "she chose Bangalore" });
  assert.ok(!JSON.stringify(sealed).includes("Bangalore"), "ciphertext must not contain plaintext");
  assert.deepEqual(await unseal(await deriveKey(sig2, alice.address), sealed), { secret: "she chose Bangalore" });
});

test("renaming the app never changes the key", () => {
  assert.ok(!KEY_MESSAGE.includes(APP_NAME), "KEY_MESSAGE must not depend on APP_NAME");
});

test("other wallet cannot read it", async () => {
  const sealed = await seal(await deriveKey(await alice.signMessage({ message: KEY_MESSAGE }), alice.address), { x: 1 });
  const wrong = await deriveKey(await bob.signMessage({ message: KEY_MESSAGE }), bob.address);
  await assert.rejects(unseal(wrong, sealed));
});

test("parse0g reads request_id, provider, tee_verified, cost from x_0g_trace", () => {
  const r = parse0g(
    {
      model: "0gm-1.0-35b-a3b",
      choices: [{ message: { content: "<think>hidden</think>Go for it." } }],
      x_0g_trace: {
        request_id: "0852f405-6c56-40c2-a800-e6fd70785065",
        provider: "0xd9966e13a6026Fcca4b13E7ff95c94DE268C471C",
        billing: { currency: "usd", total_cost: "13", total_cost_usd_micro: "13" },
        tee_verified: true,
      },
    },
    "x",
    "sealed",
  );
  assert.equal(r.text, "Go for it.");
  assert.equal(r.requestId, "0852f405-6c56-40c2-a800-e6fd70785065");
  assert.equal(r.provider, "0xd9966e13a6026Fcca4b13E7ff95c94DE268C471C");
  assert.equal(r.teeVerified, true);
  assert.equal(r.costUsd, 0.000013, "router bills in USD micro (measured 2026-11-06)");
  assert.equal(r.sealed, true, "x-0g-e2ee: sealed header");
  assert.equal(parse0g({ x_0g_trace: {} }, "m").teeVerified, null, "no tee_verified in the trace -> null, never a claimed tick");
});

test("no keys configured -> mock only; a configured 0G key never silently becomes mock", async () => {
  delete process.env.ZG_API_KEY;
  delete process.env.OPENAI_COMPAT_API_KEY;
  assert.deepEqual(configuredBackends(), ["mock"]);
  assert.equal((await complete([{ role: "user", content: "hi" }])).backend, "mock");

  process.env.ZG_API_KEY = "sk-invalid";
  process.env.ZG_BASE_URL = "http://127.0.0.1:9"; // closed port: 0G call fails fast
  assert.deepEqual(configuredBackends(), ["0g"]);
  await assert.rejects(complete([{ role: "user", content: "hi" }]));
  delete process.env.ZG_API_KEY;
});

test("parseChatReply pulls a decision out of the model's JSON, and never breaks chat on a format slip", () => {
  assert.deepEqual(parseChatReply('{"reply":"ok bestie","decision":"Take the Bangalore job or stay in Jaipur"}'), {
    reply: "ok bestie",
    decision: "Take the Bangalore job or stay in Jaipur",
    reminder: null,
    intent: null,
    remember: [],
  });
  assert.deepEqual(parseChatReply('```json\n{"reply":"hey","decision":null}\n```'), { reply: "hey", decision: null, reminder: null, intent: null, remember: [] });
  assert.deepEqual(parseChatReply('{"reply":"hey","decision":"   "}'), { reply: "hey", decision: null, reminder: null, intent: null, remember: [] });
  assert.deepEqual(parseChatReply("just prose, no json"), { reply: "just prose, no json", decision: null, reminder: null, intent: null, remember: [] });
  assert.deepEqual(parseChatReply('{"decision":"x"}'), { reply: '{"decision":"x"}', decision: null, reminder: null, intent: null, remember: [] }, "no reply field -> show raw text");
  assert.equal(parseChatReply(JSON.stringify({ reply: "a", decision: "d".repeat(500) })).decision?.length, 160);
});

test("remember: model facts are untrusted (strings only, max 3, clipped); old setup answers become facts", () => {
  const r = parseChatReply(JSON.stringify({ reply: "ok", remember: ["Lives in Pune", 42, "", "x".repeat(300), "Has a cat", "Fourth"] }));
  assert.deepEqual(r.remember.map((f) => f.length), [13, 160, 9]);
  assert.deepEqual(parseChatReply('{"reply":"ok","remember":"not a list"}').remember, []);

  assert.deepEqual(normalizeProfile({ goals: "Design", values: "", trusts: "Riya", fears: "", bigDecision: "Bangalore or Jaipur" }).facts, [
    "Her goals: Design",
    "Who she trusts: Riya",
    "A big decision she faced: Bangalore or Jaipur",
  ]);
  assert.deepEqual(normalizeProfile(null), { facts: [] });
  assert.deepEqual(normalizeProfile({ facts: ["a", "A", 3, " b "] }), { facts: ["a", "b"] });

  const many = mergeFacts([], Array.from({ length: MAX_FACTS + 5 }, (_, i) => `fact ${i}`));
  assert.equal(many.length, MAX_FACTS);
  assert.equal(many[0], "fact 5", "oldest facts drop first");
});

test("reminders: accepted only with a parseable time in the next year", () => {
  const now = Date.parse("2026-11-06T08:00:00Z");
  const r = (reminder: unknown) => parseChatReply(JSON.stringify({ reply: "ok", decision: null, reminder }), now).reminder;
  assert.deepEqual(r({ text: "call Riya", at: "2026-11-08T18:00:00+05:30" }), { text: "call Riya", at: "2026-11-08T12:30:00.000Z" });
  assert.equal(r({ text: "call Riya", at: "2026-11-01T18:00:00+05:30" }), null, "past time");
  assert.equal(r({ text: "call Riya", at: "next sunday" }), null, "unparseable");
  assert.equal(r({ text: "", at: "2026-11-08T18:00:00+05:30" }), null, "empty text");
  assert.equal(r({ text: "x", at: "2028-11-08T18:00:00+05:30" }), null, "more than a year out");
});

test("intents (Telegram, no commands): only known types with valid fields survive", () => {
  const i = (intent: unknown) => parseChatReply(JSON.stringify({ reply: "ok", decision: null, reminder: null, intent })).intent;
  assert.deepEqual(i({ type: "forget" }), { type: "forget" });
  assert.deepEqual(i({ type: "checkin_set", time: "9:05" }), { type: "checkin_set", time: "09:05" });
  assert.equal(i({ type: "checkin_set", time: "25:00" }), null, "bad time");
  assert.deepEqual(i({ type: "reminder_cancel", match: "Riya" }), { type: "reminder_cancel", match: "Riya" });
  assert.equal(i({ type: "reminder_cancel", match: "" }), null);
  assert.equal(i({ type: "transfer_money" }), null, "unknown intent types are dropped");
  assert.equal(i("forget"), null, "not an object");
});

test("analytics never sees her words: query and hash are cut from every URL", () => {
  assert.equal(stripQuery({ type: "pageview", url: "https://delulu.app/app?draft=he%20texted%20me#x" }).url, "https://delulu.app/app");
  assert.equal(stripQuery({ type: "event", url: "https://delulu.app/decide?q=Chicago%20or%20Ohio" }).url, "https://delulu.app/decide");
  assert.equal(stripQuery({ type: "pageview", url: "https://delulu.app/" }).url, "https://delulu.app/");
});
