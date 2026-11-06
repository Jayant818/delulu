import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { clientKey, reserveDemo, type DemoUsage } from "./demoGuard";
import { postAi } from "./api";

const names = ["DEMO_GUARD", "DEMO_GUARD_BURST", "DEMO_GUARD_BURST_WINDOW_SEC", "DEMO_GUARD_PER_DAY", "DEMO_GUARD_GLOBAL_PER_DAY"];
const saved = names.map((name) => process.env[name]);
beforeEach(() => { for (const name of names) delete process.env[name]; });
afterEach(() => names.forEach((name, i) => { if (saved[i] === undefined) delete process.env[name]; else process.env[name] = saved[i]; }));
const fresh = (): DemoUsage => ({ day: -1, total: 0, by: new Map() });
const now = Date.parse("2026-11-07T12:00:00Z");
const message = "Delulu is resting. This demo has a daily limit so it stays free. Try again later.";

test("default burst: 60 shared reservations per client, reset at ten minutes", () => {
  const u = fresh();
  for (let i = 0; i < 60; i++) assert.equal(reserveDemo(u, "a", now), 0);
  assert.equal(reserveDemo(u, "a", now), 600);
  assert.equal(reserveDemo(u, "a", now + 599_001), 1);
  assert.equal(reserveDemo(u, "b", now), 0);
  assert.equal(reserveDemo(u, "a", now + 600_000), 0);
  assert.equal(u.total, 62, "rejected calls do not consume quota");
});

test("default daily cap: 150 per client, across burst windows; reset at midnight IST", () => {
  const u = fresh();
  for (let i = 0; i < 150; i++) assert.equal(reserveDemo(u, "a", now + i * 600_000 / 10), 0);
  const later = now + 150 * 60_000;
  assert.equal(reserveDemo(u, "a", later), 4 * 3600);
  assert.equal(reserveDemo(u, "b", later), 0);
  assert.equal(reserveDemo(u, "a", Date.parse("2026-11-07T18:30:00Z")), 0);
  assert.equal(u.total, 1);
  assert.equal(u.by.size, 1, "inactive clients are pruned on a new day");
});

test("default global daily cap: 3000 across clients; resets the next day", () => {
  const u = fresh();
  for (let i = 0; i < 3000; i++) assert.equal(reserveDemo(u, `client-${i}`, now), 0);
  assert.equal(reserveDemo(u, "new-client", now), 23_400);
  assert.equal(u.by.size, 3000, "blocked new clients are not retained");
  assert.equal(reserveDemo(u, "new-client", now + 86_400_000), 0);
});

test("env overrides: burst window, per-client and global caps; longest Retry-After wins", () => {
  process.env.DEMO_GUARD_BURST = "1";
  process.env.DEMO_GUARD_BURST_WINDOW_SEC = "30";
  process.env.DEMO_GUARD_PER_DAY = "2";
  process.env.DEMO_GUARD_GLOBAL_PER_DAY = "3";
  const u = fresh();
  assert.equal(reserveDemo(u, "a", now), 0);
  assert.equal(reserveDemo(u, "a", now + 1), 30);
  assert.equal(reserveDemo(u, "a", now + 30_000), 0);
  assert.equal(reserveDemo(u, "a", now + 30_001), 23_370);
  assert.equal(reserveDemo(u, "b", now + 30_000), 0);
  assert.equal(reserveDemo(u, "c", now + 30_000), 23_370);
});

test("burst survives midnight, and expired bursts do not reset daily usage", () => {
  process.env.DEMO_GUARD_BURST = "1";
  const u = fresh();
  const midnight = Date.parse("2026-11-07T18:30:00Z");
  assert.equal(reserveDemo(u, "a", midnight - 1000), 0);
  assert.equal(reserveDemo(u, "a", midnight), 599);
  assert.equal(reserveDemo(u, "a", midnight + 599_000), 0);
  assert.equal(u.by.get("a")?.daily, 1);
});

test("DEMO_GUARD=off bypasses all caps without consuming reservations", () => {
  const u = fresh();
  process.env.DEMO_GUARD_GLOBAL_PER_DAY = "0";
  process.env.DEMO_GUARD = "off";
  for (let i = 0; i < 25; i++) assert.equal(reserveDemo(u, "a", now), 0);
  assert.equal(u.total, 0);
  assert.equal(u.by.size, 0);
  delete process.env.DEMO_GUARD;
  assert.ok(reserveDemo(u, "a", now) > 0);
});

test("invalid env numbers fall back to safe defaults", () => {
  for (const invalid of ["NaN", "Infinity", "-1", "1.5", "", " ", "9007199254740991"]) {
    for (const name of names.slice(1)) process.env[name] = invalid;
    const u = fresh();
    for (let i = 0; i < 60; i++) assert.equal(reserveDemo(u, "a", now), 0);
    assert.equal(reserveDemo(u, "a", now), 600);
  }
});

test("client key: first forwarded IP, then real IP, then unknown", () => {
  assert.equal(clientKey(new Headers({ "x-forwarded-for": " 203.0.113.1, 10.0.0.1", "x-real-ip": "192.0.2.1" })), "203.0.113.1");
  assert.equal(clientKey(new Headers({ "x-real-ip": " 2001:db8::1 " })), "2001:db8::1");
  assert.equal(clientKey(new Headers({ "x-forwarded-for": ", 10.0.0.1", "x-real-ip": "192.0.2.1" })), "192.0.2.1");
  assert.equal(clientKey(new Headers()), "unknown");
});

test("all four paid routes return the exact 429 contract before any model call", async (t) => {
  process.env.DEMO_GUARD_GLOBAL_PER_DAY = "0";
  const network = t.mock.method(globalThis, "fetch", () => { throw new Error("must not call model"); });
  const routes = [
    [await import("../app/api/chat/route"), { message: "hi" }],
    [await import("../app/api/decide/route"), { question: "go?", view: "sane" }],
    [await import("../app/api/brief/route"), { kind: "hair", style: "bob" }],
    [await import("../app/api/checkin/route"), {}],
  ] as const;
  for (const [route, body] of routes) {
    const res = await route.POST(new Request("http://localhost/api/test", { method: "POST", body: JSON.stringify(body) }));
    assert.equal(res.status, 429);
    assert.deepEqual(await res.json(), { error: "demo_limit", message });
    assert.match(res.headers.get("Retry-After")!, /^[1-9]\d*$/);
  }
  assert.equal(network.mock.callCount(), 0);
});

test("postAi preserves the friendly limit message for every UI caller", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: "demo_limit", message }, { status: 429 }));
  await assert.rejects(postAi("/api/chat", { message: "hi" }), { message, name: "DemoLimitError" });
});
