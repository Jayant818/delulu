// Run: npm test. Checks the two pieces that fail silently if wrong: the memory crypto and 0G response parsing.
import assert from "node:assert/strict";
import { test } from "node:test";
import { privateKeyToAccount } from "viem/accounts";
import { complete, configuredBackends, parse0g } from "./ai/provider";
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
        billing: { total_cost: "1935800000000000" },
        tee_verified: true,
      },
    },
    "x",
  );
  assert.equal(r.text, "Go for it.");
  assert.equal(r.requestId, "0852f405-6c56-40c2-a800-e6fd70785065");
  assert.equal(r.provider, "0xd9966e13a6026Fcca4b13E7ff95c94DE268C471C");
  assert.equal(r.teeVerified, true);
  assert.equal(r.costNeuron, "1935800000000000");
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
