// Web assistant logic (pure): intents, reminders, in-app scheduler, check-backs. Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import type { ApiResult } from "./api";
import { answerCheckback, applyChatResult, checkbackJob, runDue } from "./assistant";
import type { Memory } from "./memory";

const NOW = Date.parse("2026-11-06T12:00:00Z"); // 17:30 IST
const base = (): Memory => ({ profile: { goals: "g", values: "v", trusts: "t", fears: "f", bigDecision: "b" }, chat: [], decisions: [], jobs: [], dailyAt: null });
const res = (over: Partial<ApiResult>): ApiResult =>
  ({ text: "ok", backend: "mock", model: "mock", requestId: "r1", provider: null, teeVerified: null, sealed: null, costUsd: null, ...over }) as ApiResult;
const apply = (m: Memory, over: Partial<ApiResult>, demo = false) => applyChatResult(m, res(over), undefined, NOW, demo);

test("plain reply + decision card + reminder (job + note in the reply)", () => {
  const { memory } = apply(base(), { text: "hey", decision: "Bangalore or Jaipur", reminder: { text: "call Riya", at: "2026-11-08T12:30:00.000Z" } });
  assert.equal(memory.chat.at(-1)!.decision, "Bangalore or Jaipur");
  assert.match(memory.chat.at(-1)!.content, /Reminder set: call Riya/);
  assert.equal(memory.jobs.length, 1);
});

test("intents are performed by the app, not described by the model", () => {
  assert.equal(apply(base(), { text: "IGNORED", intent: { type: "help" } }).memory.chat.at(-1)!.kind, "help");
  assert.equal(apply(base(), { intent: { type: "privacy" } }).memory.chat.at(-1)!.kind, "privacy");
  assert.equal(apply(base(), { intent: { type: "forget" } }).memory.chat.at(-1)!.kind, "confirm-forget", "delete asks first");
  const ci = apply(base(), { intent: { type: "checkin_set", time: "21:00" } }).memory;
  assert.equal(ci.dailyAt, "21:00");
  assert.equal(Date.parse(ci.jobs[0].at), Date.parse("2026-11-06T15:30:00Z"), "next 21:00 IST");
  assert.equal(apply(ci, { intent: { type: "checkin_off" } }).memory.jobs.length, 0);
  const demo = apply(base(), { intent: { type: "checkin_set", time: "21:00" } }, true).memory;
  assert.equal(Date.parse(demo.jobs[0].at), NOW + 60_000, "demo: first check-in in 1 min");
  assert.equal(apply(base(), { intent: { type: "decide", question: "X or Y" } }).effect.navigate, "/decide?q=X%20or%20Y");
});

test("cancel a reminder by name; unknown name shows the list", () => {
  let m = apply(base(), { reminder: { text: "call Riya", at: "2026-11-08T12:30:00.000Z" } }).memory;
  m = apply(m, { reminder: { text: "drink water", at: "2026-11-07T12:30:00.000Z" } }).memory;
  const c = apply(m, { intent: { type: "reminder_cancel", match: "riya" } }).memory;
  assert.deepEqual(c.jobs.map((j) => j.text), ["drink water"]);
  const miss = apply(m, { intent: { type: "reminder_cancel", match: "gym" } }).memory;
  assert.equal(miss.jobs.length, 2);
  assert.equal(miss.chat.at(-1)!.kind, "reminders");
});

test("in-app scheduler: due items land in the chat once; daily reschedules; check-back answer becomes memory", () => {
  const m0 = base();
  m0.decisions = [{ id: "d1", question: "Bangalore or Jaipur", views: {}, choice: "future", at: "", checkInAt: new Date(NOW - 1).toISOString() }];
  m0.jobs = [
    checkbackJob("d1", new Date(NOW - 1).toISOString()),
    { id: "r", kind: "reminder", at: new Date(NOW - 1).toISOString(), text: "call Riya" },
    { id: "late", kind: "reminder", at: new Date(NOW + 60_000).toISOString(), text: "later" },
    { id: "dd", kind: "daily", at: new Date(NOW - 1).toISOString() },
  ];
  m0.dailyAt = "21:00";
  assert.equal(runDue(base(), NOW).memory.chat.length, 0, "nothing due, nothing added");
  const { memory: m1, checkinDue } = runDue(m0, NOW);
  assert.ok(checkinDue, "daily check-in asks for one 0G text");
  assert.deepEqual(m1.chat.map((c) => c.kind), ["checkback", "reminder"]);
  assert.deepEqual(m1.jobs.map((j) => j.kind).sort(), ["daily", "reminder"], "future reminder kept, daily rescheduled");
  assert.equal(runDue(m1, NOW).memory.chat.length, 2, "never delivered twice");
  const m2 = answerCheckback(m1, "d1", "glad", NOW);
  assert.equal(m2.decisions[0].outcome, "glad");
  assert.equal(runDue({ ...m2, jobs: [checkbackJob("d1", new Date(NOW - 1).toISOString())] }, NOW).memory.chat.length, m2.chat.length, "answered decisions do not ask again");
});
