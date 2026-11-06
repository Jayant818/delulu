// Live check: run this the moment the real keys are in .env.local.  npm run check:live
// Makes ~11 real calls through the same brain the bot uses and prints what a judge would see.
// Exit code 1 if anything is not served by 0G in private (TEE-verified) mode, so a silent fallback cannot pass.
import { Bot } from "grammy";
import { complete, configuredBackends, ZG_MODEL, ZG_TRUST_MODE, type AiResult } from "../src/lib/ai/provider";
import { allViews, briefFor, chatTurn, checkInText, type Context } from "../src/lib/brain";
import { IMAGE_MODEL } from "../src/lib/tryon";

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
  // Sealed = 0G private mode AND the router says so (x-0g-e2ee: sealed) or verified the TEE signature.
  const ok = r.backend === "0g" && r.teeVerified !== false && (r.teeVerified === true || r.sealed === true);
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label.padEnd(14)} ${r.backend.padEnd(6)} req=${r.requestId ?? "-"} sealed=${r.sealed} tee=${r.teeVerified ?? "not reported"} ${ms} ms cost=${r.costUsd != null ? `$${r.costUsd.toFixed(6)}` : "-"}` +
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

  // 7. Try-on: the brief is a 0G call; the image model is only PROBED here (a real image costs money: --image).
  const [b, t7] = await timed(() => briefFor("hair", "Copper red, same cut", ctx.profile));
  show("brief", b, t7);
  const okey = process.env.OPENAI_API_KEY?.trim();
  if (!okey) console.log("SKIP  image model    OPENAI_API_KEY not set (try-on runs in MOCK)");
  else {
    const r = await fetch(`https://api.openai.com/v1/models/${IMAGE_MODEL}`, { headers: { Authorization: `Bearer ${okey}` } });
    if (r.ok) console.log(`PASS  image model    ${IMAGE_MODEL} is available to this key`);
    else {
      failures++;
      console.log(`FAIL  image model    ${IMAGE_MODEL}: HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
    }
    if (process.argv.includes("--image")) console.log("      (--image: make one real try-on from the app instead, so the spend cap counts it)");
  }

  console.log(failures ? `\n${failures} problem(s). Fix before the demo (see REHEARSAL.md).` : "\nAll good: every answer came from 0G private mode, reported sealed by the router.");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error("live check crashed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
