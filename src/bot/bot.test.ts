// Offline test of the whole Telegram flow: a fake Telegram API (grammY transformer) + MOCK model + a real
// encrypted store in a temp dir. No token, no network. Run: npm test
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createBot, footer } from "./bot";
import { BotStore } from "./store";

delete process.env.ZG_API_KEY; // MOCK backend
delete process.env.OPENAI_COMPAT_API_KEY;

type Call = { method: string; payload: Record<string, unknown> };
const USER = { id: 4242, is_bot: false, first_name: "Riya" };
const CHAT = { id: 4242, type: "private" as const, first_name: "Riya" };
const BOT_INFO = {
  id: 1, is_bot: true, first_name: "Delulu", username: "delulu_test_bot",
  can_join_groups: false, can_read_all_group_messages: false, supports_inline_queries: false,
  can_connect_to_business: false, has_main_web_app: false,
} as never;

async function setup() {
  const dir = await mkdtemp(path.join(tmpdir(), "delulu-bot-"));
  const master = randomBytes(32).toString("base64");
  const store = new BotStore(dir, master);
  const { bot, runDue, loadSchedule } = createBot("123:fake", { store, checkBackMs: 60_000 }, BOT_INFO);
  const calls: Call[] = [];
  let mid = 100;
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    const result = method.startsWith("send") ? { message_id: ++mid, date: 0, chat: CHAT, text: "" } : true;
    return { ok: true, result } as never;
  });
  let uid = 1;
  const text = (t: string) =>
    bot.handleUpdate({
      update_id: uid++,
      message: {
        message_id: uid, date: 0, chat: CHAT, from: USER, text: t,
        ...(t.startsWith("/") ? { entities: [{ type: "bot_command", offset: 0, length: t.split(" ")[0].length }] } : {}),
      },
    } as never);
  const press = (data: string) =>
    bot.handleUpdate({
      update_id: uid++,
      callback_query: { id: String(uid), from: USER, chat_instance: "x", data, message: { message_id: 5, date: 0, chat: CHAT, text: "" } },
    } as never);
  const sent = () => calls.filter((c) => c.method === "sendMessage").map((c) => c.payload);
  const lastSent = () => sent().at(-1)!;
  const buttons = (p: Record<string, unknown>) =>
    ((p.reply_markup as { inline_keyboard?: { text: string; callback_data: string }[][] })?.inline_keyboard ?? []).flat();
  return { dir, master, store, calls, text, press, sent, lastSent, buttons, runDue, loadSchedule, bot };
}

test("telegram flow: start -> chat (no setup questions) -> decision card -> 3 views -> pick -> proof -> forget", async () => {
  const t = await setup();

  await t.text("/start");
  assert.match(String(t.sent()[0].text), /never<\/b> ask for money, crypto, a wallet/, "anti-scam promise in the intro");
  assert.equal(t.sent().length, 1, "only the intro: no setup questions");
  assert.doesNotMatch(String(t.lastSent().text), /1\/5|quick questions/);

  // She just talks; a lasting fact about her is learned (mock: "I'm ..." -> one fact).
  await t.text("I'm a product designer and my sister is my person");
  assert.deepEqual((await t.store.load(4242))?.profile.facts, ["I'm a product designer and my sister is my person"]);

  // Free talk with a decision in it -> reply + footer + "See perspectives" button.
  await t.text("parents want me home but should I take the Bangalore job or stay in Jaipur?");
  const reply = t.lastSent();
  assert.match(String(reply.text), /MOCK · no AI called/, "footer marks the backend honestly");
  assert.match(String(reply.text), /Sounds like a decision:/);
  const see = t.buttons(reply).find((b) => b.text.startsWith("See perspectives"));
  assert.ok(see, "decision card has a button");

  // Three views in one message, one "Go with" button per voice.
  await t.press(see!.callback_data);
  const views = t.lastSent();
  for (const title of ["Delulu", "Future You at 30", "Your Bestie"]) assert.match(String(views.text), new RegExp(`<b>${title}</b>`));
  const go = t.buttons(views);
  assert.equal(go.length, 3);

  await t.press(go[1].callback_data);
  assert.match(String(t.lastSent().text), /going with <b>Future You at 30<\/b>/);
  assert.ok(t.calls.some((c) => c.method === "editMessageReplyMarkup"), "buttons removed after the pick");

  await t.text("is this private?");
  assert.match(String(t.lastSent().text), /What happens to what you tell me/, "privacy intent: the honest text");
  assert.match(String(t.lastSent().text), /chat · MOCK/, "…plus the request IDs");
  assert.match(String(t.lastSent().text), /view · MOCK/);

  // Encrypted at rest: no plaintext, no telegram id in file names.
  const files = await readdir(t.dir);
  assert.equal(files.length, 1);
  assert.ok(!files[0].includes("4242"), "file name does not reveal the telegram id");
  const raw = await readFile(path.join(t.dir, files[0]), "utf8");
  for (const s of ["Bangalore", "sister", "Future", "4242"]) assert.ok(!raw.includes(s), `no plaintext "${s}" on disk`);
  const u = await t.store.load(4242);
  assert.equal(u?.decisions[0].choice, "future");
  assert.ok(+new Date(u!.decisions[0].checkInAt) - +new Date(u!.decisions[0].at) === 60_000, "demo check-back = 1 min");

  // Wrong master key cannot read it.
  await assert.rejects(new BotStore(t.dir, randomBytes(32).toString("base64")).load(4242).then((x) => {
    if (x === null) throw new Error("not found");
  }));

  // "delete everything" asks first; "No" keeps it, "Yes" deletes.
  await t.text("delete everything");
  const confirm = t.buttons(t.lastSent());
  assert.deepEqual(confirm.map((b) => b.callback_data), ["fg:yes", "fg:no"]);
  await t.press("fg:no");
  assert.ok(await t.store.load(4242), "No keeps the record");
  await t.text("delete everything");
  await t.press("fg:yes");
  assert.equal((await readdir(t.dir)).length, 0, "Yes deletes the record");
  assert.equal(await t.store.load(4242), null);

  // After deleting, she just talks again: a normal reply, no questions, nothing remembered from before.
  await t.text("hey");
  assert.match(String(t.lastSent().text), /MOCK/);
  assert.deepEqual((await t.store.load(4242))?.profile.facts, []);
});

test("anti-scam: no outgoing message ever asks for a wallet, seed, payment or link click", async () => {
  const t = await setup();
  await t.text("/start");
  await t.text("hi");
  await t.text("what can you do");
  await t.text("is this private?");
  await t.text("remind me to call Riya");
  await t.text("what are my reminders");
  await t.text("delete everything");
  for (const p of t.sent()) {
    const s = String(p.text).toLowerCase();
    assert.ok(!/(send|enter|share|connect) (your|a) (wallet|seed|private key|payment|card)|click (this|the) link|airdrop|\bearn /.test(s), s.slice(0, 80));
    // Text-only product (Jayant, TG 3412): no message may tell her to type a slash command.
    assert.ok(!/(^|[\s(>"])\/[a-z]+/.test(s), `slash command in a message: ${s.slice(0, 80)}`);
  }
  assert.match(String(t.sent().find((p) => /no commands/i.test(String(p.text)))?.text), /help me decide/, "help is in plain words");
});

test("footer: 0G shows request id + TEE flag; fallback is labelled not sealed", () => {
  const base = { model: "m", provider: null, costUsd: null, sealed: null } as const;
  assert.equal(footer({ ...base, backend: "0g", requestId: "0852f405-6c56", teeVerified: true }), "<i>🔒 0G · 0852f405 · TEE ✓</i>");
  assert.equal(footer({ ...base, backend: "0g", requestId: "7edd2a7a-4dd1", teeVerified: null, sealed: true }), "<i>🔒 0G · 7edd2a7a · sealed</i>", "what the router reports today");
  assert.match(footer({ ...base, backend: "openai", requestId: "chatcmpl-1", teeVerified: null }), /not sealed/);
});

async function onboarded() {
  const t = await setup();
  await t.text("/start");
  return t;
}

test("T3 check-back: picking a decision schedules it; runDue asks how it went; the answer becomes memory", async () => {
  const t = await onboarded();
  await t.text("help me decide take the Bangalore job or stay in Jaipur");
  await t.press(t.buttons(t.lastSent())[0].callback_data); // go with Delulu
  assert.equal(await t.runDue(Date.now() + 30_000), 0, "nothing due before the check-back time");
  assert.equal(await t.runDue(Date.now() + 61_000), 1);
  const msg = t.lastSent();
  assert.match(String(msg.text), /Check-back[\s\S]*take the Bangalore job or stay in Jaipur/);
  const outcome = t.buttons(msg).find((b) => b.text.includes("Glad"))!;
  await t.press(outcome.callback_data);
  const u = await t.store.load(4242);
  assert.equal(u?.decisions[0].outcome, "glad");
  assert.equal(u?.jobs.length, 0, "one-shot job removed");
  assert.equal(await t.runDue(Date.now() + 120_000), 0, "never delivered twice");
});

test("T3 daily check-in: 'check in on me every evening at 9' schedules 21:00 IST and reschedules after sending", async () => {
  const t = await onboarded();
  await t.text("check in on me every evening at 9");
  assert.match(String(t.lastSent().text), /every day at 21:00 IST/);
  const job = (await t.store.load(4242))!.jobs.find((j) => j.kind === "daily")!;
  const at = Date.parse(job.at);
  const ist = new Date(at + 330 * 60_000);
  assert.equal(`${ist.getUTCHours()}:${ist.getUTCMinutes()}`, "21:0", "scheduled at 21:00 IST");
  assert.ok(at > Date.now() && at <= Date.now() + 86_400_000, "within the next 24 h");
  assert.equal(await t.runDue(at + 1000), 1);
  assert.match(String(t.lastSent().text), /MOCK · no AI called/, "check-in is an AI message with the honest footer");
  const next = (await t.store.load(4242))!.jobs.find((j) => j.kind === "daily")!;
  assert.equal(Date.parse(next.at) - at, 86_400_000, "rescheduled for the same time tomorrow");
  await t.text("stop checking in");
  assert.equal((await t.store.load(4242))!.jobs.filter((j) => j.kind === "daily").length, 0);
});

test("T3 reminders: from chat, listed, cancellable by name, delivered once; survive a restart; deleting clears them", async () => {
  const t = await onboarded();
  await t.text("remind me to call Riya");
  const set = t.lastSent();
  assert.match(String(set.text), /Reminder set:<\/b> call Riya/);
  assert.ok(t.buttons(set).some((b) => b.text === "Cancel reminder"));
  await t.text("what are my reminders");
  assert.match(String(t.lastSent().text), /⏰ call Riya/);

  // Restart: a new bot instance rebuilds the schedule from the encrypted store.
  const reopened = createBot("123:fake", { store: new BotStore(t.dir, t.master) }, BOT_INFO);
  const calls: string[] = [];
  reopened.bot.api.config.use(async (_p, method, payload) => {
    calls.push(String((payload as { text?: string }).text ?? method));
    return { ok: true, result: { message_id: 1, date: 0, chat: { id: 4242, type: "private" }, text: "" } } as never;
  });
  await reopened.loadSchedule();
  assert.equal(await reopened.runDue(Date.now() + 61_000), 1);
  assert.match(calls.at(-1)!, /Reminder:<\/b> call Riya/);
  assert.equal(await reopened.runDue(Date.now() + 120_000), 0, "delivered once");

  // Cancel path + forget.
  await t.text("remind me to drink water");
  const cancel = t.buttons(t.lastSent()).find((b) => b.text === "Cancel reminder")!;
  await t.press(cancel.callback_data);
  assert.equal((await t.store.load(4242))!.jobs.filter((j) => j.kind === "reminder").length, 0);
  await t.text("remind me to stretch");
  await t.text("cancel the stretch reminder");
  assert.match(String(t.lastSent().text), /Cancelled ⏰ stretch/, "cancel by name");
  await t.text("remind me to sleep");
  await t.text("delete everything");
  await t.press("fg:yes");
  assert.equal(await t.runDue(Date.now() + 61_000), 0, "nothing fires after deleting");
});
