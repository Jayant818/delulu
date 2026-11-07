// Try-on: spend caps (his money), MOCK mode, the exact request sent to the image model. No network: a local fake
// OpenAI server stands in. Run: npm test
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { photoConsent } from "./tryon-client";

test("photo consent names the real provider and never describes MOCK as on-device", () => {
  assert.match(photoConsent("mock", "Send"), /our server.*MOCK.*unchanged/);
  assert.match(photoConsent("openai", "Send"), /“Send”.*OpenAI.*not 0G, not sealed/);
  assert.match(photoConsent("0g"), /“See it on me”.*0G.*standard tier/);
});

// Env must be set before the modules load (caps are read at import). CommonJS: no top-level await, so one promise.
const ready = (async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "delulu-tryon-"));
  process.env.TRYON_USAGE_FILE = path.join(dir, "usage.json");
  process.env.TRYON_CAP_TOTAL = "7";
  process.env.TRYON_CAP_USER = "5";
  delete process.env.OPENAI_API_KEY;
  return { lib: await import("./tryon"), route: await import("../app/api/tryon/route") };
})();

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const call = async (fields: Record<string, string>, img: Blob | null = new Blob([PNG], { type: "image/png" }), ip = "1.2.3.4") => {
  const { POST } = (await ready).route;
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  if (img) f.set("image", img, "p.png");
  return POST(new Request("http://x/api/tryon", { method: "POST", body: f, headers: { "x-forwarded-for": ip } }));
};

test("caps: per user and total, per IST day; refund gives one back", async () => {
  const { reserve, refund } = (await ready).lib;
  const now = Date.parse("2026-11-06T12:00:00Z");
  let u = { day: "", total: 0, by: {} as Record<string, number> };
  for (let i = 0; i < 5; i++) {
    const r = reserve(u, ["a:x", "i:y"], now);
    assert.ok(r.ok);
    u = r.ok ? r.usage : u;
  }
  assert.equal(reserve(u, ["a:x", "i:other"], now).ok, false, "6th image for the same wallet is refused");
  assert.equal(reserve(u, ["a:other", "i:y"], now).ok, false, "a new wallet on the same IP is refused too");
  u = refund(u, ["a:x", "i:y"]);
  assert.ok(reserve(u, ["a:x", "i:y"], now).ok, "a refund frees one");
  assert.ok(reserve(u, ["a:x", "i:y"], now + 86_400_000).ok, "next day resets");
});

test("prompt keeps her identity and only changes hair / nails", async () => {
  const { tryonPrompt } = (await ready).lib;
  assert.match(tryonPrompt("hair", "Sleek bob"), /change ONLY her hairstyle to: Sleek bob.*Keep her face, identity/);
  assert.match(tryonPrompt("nails", "Glazed chrome"), /paint the nails with: Glazed chrome/);
});

test("route validates input and runs in MOCK mode without a key (nothing spent)", async () => {
  assert.equal((await call({ kind: "clothes", style: "x" })).status, 400, "clothes are out of scope");
  assert.equal((await call({ kind: "hair", style: "" })).status, 400);
  assert.equal((await call({ kind: "hair", style: "bob" }, new Blob(["x"], { type: "text/plain" }))).status, 400);
  const r = await call({ kind: "hair", style: "Sleek bob", address: "0xabc" });
  const j = await r.json();
  assert.equal(j.mock, true);
  assert.equal(j.image, `data:image/png;base64,${PNG.toString("base64")}`, "MOCK echoes the photo");
  await assert.rejects(readFile(process.env.TRYON_USAGE_FILE!), "MOCK writes no usage");
});

test("real path: exact request to the image model, caps enforced, failures refunded, nothing else on disk", async () => {
  const seen: string[] = [];
  let fail = false;
  const srv = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      seen.push(body);
      if (fail) {
        res.writeHead(500).end("{}");
        return;
      }
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ data: [{ b64_json: "QUJD" }] }));
    });
  });
  await new Promise<void>((r) => srv.listen(0, r));
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${(srv.address() as { port: number }).port}`;
  process.env.OPENAI_API_KEY = "sk-test";
  try {
    const ok = await (await call({ kind: "nails", style: "Glazed chrome", address: "0xA" })).json();
    assert.equal(ok.mock, false);
    assert.equal(ok.image, "data:image/png;base64,QUJD");
    const sent = seen[0];
    assert.match(sent, /name="model"\r\n\r\ngpt-image-2\.5-sunburst/);
    assert.match(sent, /name="quality"\r\n\r\nmedium/);
    assert.ok(!/input_fidelity/.test(sent), "never send input_fidelity (the model rejects it)");

    fail = true;
    assert.equal((await call({ kind: "hair", style: "bob", address: "0xA" })).status, 502);
    fail = false;
    const usage = JSON.parse(await readFile(process.env.TRYON_USAGE_FILE!, "utf8"));
    assert.equal(usage.total, 1, "the failed call was refunded");
    assert.ok(!JSON.stringify(usage).includes("0xA") && !JSON.stringify(usage).includes("1.2.3.4"), "no raw wallet or IP on disk");

    for (let i = 0; i < 4; i++) assert.equal((await call({ kind: "hair", style: "bob", address: "0xA" })).status, 200);
    assert.equal((await call({ kind: "hair", style: "bob", address: "0xA" })).status, 429, "6th for this person");
    assert.equal((await call({ kind: "hair", style: "bob", address: "0xB" }, undefined, "5.6.7.8")).status, 200);
    assert.equal((await call({ kind: "hair", style: "bob", address: "0xC" }, undefined, "9.9.9.9")).status, 200);
    assert.equal((await call({ kind: "hair", style: "bob", address: "0xD" }, undefined, "8.8.8.8")).status, 429, "total cap (7 in this test)");
  } finally {
    delete process.env.OPENAI_API_KEY;
    srv.close();
  }
});

test("0G path (default with a 0G key): reference-image request, request id back, and NO silent fallback to OpenAI", async () => {
  const bodies: string[] = [];
  let openaiHits = 0;
  let fail = false;
  const zg = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      bodies.push(`${req.url} ${body}`);
      if (fail) return void res.writeHead(500).end("{}");
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ data: [{ b64_json: "WkdH" }], x_0g_trace: { request_id: "req-0g-1" } }));
    });
  });
  const oa = createServer((_req, res) => {
    openaiHits++;
    res.writeHead(200).end("{}");
  });
  await new Promise<void>((r) => zg.listen(0, r));
  await new Promise<void>((r) => oa.listen(0, r));
  process.env.TRYON_USAGE_FILE = path.join(await mkdtemp(path.join(tmpdir(), "delulu-tryon2-")), "usage.json"); // fresh caps
  process.env.ZG_API_KEY = "sk-zg-test";
  process.env.ZG_BASE_URL = `http://127.0.0.1:${(zg.address() as { port: number }).port}`;
  process.env.OPENAI_API_KEY = "sk-oa-test";
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${(oa.address() as { port: number }).port}`;
  try {
    const lib = (await ready).lib;
    assert.equal(lib.imageBackend(), "0g", "0G wins when both keys exist");
    assert.match(lib.tryonPrivacyLine("0g"), /image model on 0G's network \(standard tier, not sealed\), then deleted/);
    const ok = await (await call({ kind: "hair", style: "Copper red", address: "0xZ" }, undefined, "7.7.7.7")).json();
    assert.equal(ok.backend, "0g");
    assert.equal(ok.requestId, "req-0g-1");
    assert.equal(ok.image, "data:image/png;base64,WkdH");
    const [url, raw] = [bodies[0].split(" ")[0], bodies[0].slice(bodies[0].indexOf(" ") + 1)];
    assert.equal(url, "/images/generations");
    const sent = JSON.parse(raw);
    assert.equal(sent.model, "bytedance/seedream-5.0-flash");
    assert.equal(sent.response_format, "b64_json");
    assert.match(sent.image[0], /^data:image\/png;base64,/, "the photo goes as a reference image");
    fail = true;
    assert.equal((await call({ kind: "hair", style: "Bob", address: "0xZ" }, undefined, "7.7.7.7")).status, 502);
    assert.equal(openaiHits, 0, "a 0G failure never sends her photo to OpenAI");
  } finally {
    delete process.env.ZG_API_KEY;
    delete process.env.ZG_BASE_URL;
    delete process.env.OPENAI_API_KEY;
    zg.close();
    oa.close();
  }
});

test("Vercel: with no usage file set, the counts go to the writable temp dir (the deploy folder is read-only)", async () => {
  const { withUsage } = (await ready).lib;
  const keep = process.env.TRYON_USAGE_FILE;
  delete process.env.TRYON_USAGE_FILE;
  process.env.VERCEL = "1";
  const file = path.join(tmpdir(), "delulu-tryon-usage.json");
  await rm(file, { force: true }); // no stale file from an earlier run can make this pass
  try {
    await withUsage((u) => ({ usage: { ...u, total: 99 }, result: null }));
    assert.equal(JSON.parse(await readFile(file, "utf8")).total, 99);
  } finally {
    delete process.env.VERCEL;
    process.env.TRYON_USAGE_FILE = keep;
    await rm(file, { force: true });
  }
});
