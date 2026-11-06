// Live check: run this the moment the real keys are in .env.local.  npm run check:live
// Makes ~11 real calls through the same brain the bot uses and prints what a judge would see.
// Exit code 1 if anything is not served by 0G in private (TEE-verified) mode, so a silent fallback cannot pass.
import { Bot } from "grammy";
import { complete, configuredBackends, ZG_MODEL, ZG_TRUST_MODE, type AiResult } from "../src/lib/ai/provider";
import { allViews, chatTurn, checkInText, type Context } from "../src/lib/brain";

const ctx: Context = {
  profile: {
    goals: "Become a product designer at a good studio",
    values: "Freedom, family, honesty",
    trusts: "My older sister Riya",
    fears: "Letting my parents down",
    bigDecision: "Take the design job in Bangalore or stay in Jaipur",
  },
  decisions: [],
  history: [],
};

let failures = 0;
function show(label: string, r: AiResult, ms: number) {
  const ok = r.backend === "0g" && r.teeVerified === true;
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label.padEnd(14)} ${r.backend.padEnd(6)} req=${r.requestId ?? "-"} tee=${r.teeVerified} model=${r.model} ${ms} ms` +
      (r.fallbackReason ? `\n      0G error: ${r.fallbackReason}` : ""),
  );
}
async function timed<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const t = Date.now();
  const v = await fn();
  return [v, Date.now() - t];
}

async function main() {
  console.log(`backends: ${configuredBackends().join(" -> ")} · model ${ZG_MODEL} · trust mode ${ZG_TRUST_MODE}\n`);

  // 0. Telegram token -> bot username (put it in NEXT_PUBLIC_TELEGRAM_BOT for the landing page button).
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (token) {
    try {
      const me = await new Bot(token).api.getMe();
      console.log(`PASS  telegram       @${me.username} -> set NEXT_PUBLIC_TELEGRAM_BOT=${me.username}`);
    } catch (e) {
      failures++;
      console.log(`FAIL  telegram       ${(e as Error).message}`);
    }
  } else console.log("SKIP  telegram       TELEGRAM_BOT_TOKEN not set");

  // 1. Plain call.
  const [plain, t1] = await timed(() => complete([{ role: "user", content: "Say hi in five words." }], { maxTokens: 30 }));
  show("plain", plain, t1);

  // 2. Chat turn with a decision in it: the card depends on this.
  const [d, t2] = await timed(() => chatTurn(ctx, "ugh my parents want me home but the bangalore offer pays 2x. should i take it or stay in jaipur?"));
  show("chat+decision", d.ai, t2);
  console.log(`      reply: ${d.reply.slice(0, 140)}\n      decision: ${d.decision ?? "NONE  <- the decision card will not appear; reword the demo message"}`);
  if (!d.decision) failures++;

  // 3. Chat turn with a reminder: the scheduler depends on this.
  const [r, t3] = await timed(() => chatTurn(ctx, "remind me sunday 6pm to call riya"));
  show("chat+reminder", r.ai, t3);
  console.log(`      reminder: ${r.reminder ? `${r.reminder.text} @ ${r.reminder.at}` : "NONE  <- reminders will not be set"}`);
  if (!r.reminder) failures++;

  // 4. Small talk must NOT produce a decision card.
  const [s, t4] = await timed(() => chatTurn(ctx, "hiii how are you"));
  show("small talk", s.ai, t4);
  if (s.decision) {
    failures++;
    console.log(`      FAIL: small talk produced a decision: ${s.decision}`);
  }

  // 4b. No commands in the bot: these plain sentences must route to the right intent.
  for (const [msg, want] of [
    ["delete everything", "forget"],
    ["check in on me every evening at 9", "checkin_set 21:00"],
    ["what can you do", "help"],
    ["what are my reminders", "reminders_list"],
  ] as const) {
    const [x, ms] = await timed(() => chatTurn(ctx, msg));
    show(`intent`, x.ai, ms);
    const got = x.intent ? [x.intent.type, "time" in x.intent ? x.intent.time : ""].join(" ").trim() : "NONE";
    const ok = got === want;
    if (!ok) failures++;
    console.log(`      "${msg}" -> ${got}${ok ? "" : `   <- expected ${want}`}`);
  }

  // 5. Three voices in parallel: three request IDs.
  const [views, t5] = await timed(() => allViews(ctx, "Take the design job in Bangalore or stay in Jaipur"));
  for (const [v, res] of Object.entries(views)) {
    if ("error" in res) {
      failures++;
      console.log(`FAIL  view:${v.padEnd(9)} ${res.error}`);
    } else show(`view:${v}`, res, t5);
  }

  // 6. Daily check-in text.
  const [c, t6] = await timed(() => checkInText(ctx));
  show("check-in", c, t6);
  console.log(`      ${c.text.slice(0, 140)}`);

  console.log(failures ? `\n${failures} problem(s). Fix before the demo (see REHEARSAL.md).` : "\nAll good: every answer came from 0G private mode with a verified TEE signature.");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error("live check crashed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
