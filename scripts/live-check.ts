// Live check: run this the moment the real keys are in .env.local.  npm run check:live
// Makes ~11 real calls through the same brain the bot uses and prints what a judge would see.
// Exit code 1 if anything is not served by 0G in private (TEE-verified) mode, so a silent fallback cannot pass.
import { Bot } from "grammy";
import { complete, configuredBackends, ZG_MODEL, ZG_TRUST_MODE, type AiResult } from "../src/lib/ai/provider";
import { allViews, briefFor, chatTurn, checkInText, type Context } from "../src/lib/brain";
import { imageBackend, imageModel } from "../src/lib/tryon";

const ctx: Context = {
  profile: {
    facts: [
      "Wants to become a product designer at a good studio",
      "Values freedom, family and honesty",
      "Trusts her older sister Emma with big choices",
      "Afraid of letting her parents down",
    ],
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
  const [d, t2] = await timed(() => chatTurn(ctx, "ugh my parents want me home but the chicago offer pays 2x. should i take it or stay in ohio?"));
  show("chat+decision", d.ai, t2);
  console.log(`      reply: ${d.reply.slice(0, 140)}\n      decision: ${d.decision ?? "NONE  <- the decision card will not appear; reword the demo message"}`);
  if (!d.decision) failures++;
  // The demo shows the card in the chat; a "decide" intent would jump straight to Decide instead.
  if (d.intent) {
    failures++;
    console.log(`      FAIL: the demo message routed to the "${d.intent.type}" intent instead of a decision card`);
  }

  // 3. Chat turn with a reminder: the scheduler depends on this.
  const [r, t3] = await timed(() => chatTurn(ctx, "remind me sunday 6pm to call mom"));
  show("chat+reminder", r.ai, t3);
  console.log(`      reminder: ${r.reminder ? `${r.reminder.text} @ ${r.reminder.at}` : "NONE  <- reminders will not be set"}`);
  if (!r.reminder) failures++;

  // 3b. No setup questions: the profile grows from the chat, so the model must pick up a lasting fact.
  const [f, t3b] = await timed(() => chatTurn(ctx, "i'm a 22 yo ux intern in austin and my cat mochi is my whole personality lol"));
  show("chat+remember", f.ai, t3b);
  console.log(`      remember: ${f.remember.length ? JSON.stringify(f.remember) : "NONE  <- Delulu will not learn about her from the chat"}`);
  if (!f.remember.length) failures++;

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
    ["help me decide between the chicago job and staying in ohio", "decide"],
  ] as const) {
    const [x, ms] = await timed(() => chatTurn(ctx, msg));
    show(`intent`, x.ai, ms);
    const got = x.intent ? [x.intent.type, "time" in x.intent ? x.intent.time : ""].join(" ").trim() : "NONE";
    // "help me decide …" may also come back as a decision card (same screen one tap later): both are fine.
    const ok = got === want || (want === "decide" && got === "NONE" && !!x.decision);
    if (!ok) failures++;
    console.log(`      "${msg}" -> ${got}${ok ? "" : `   <- expected ${want}`}`);
  }

  // 5. Three voices in parallel: three request IDs.
  const [views, t5] = await timed(() => allViews(ctx, "Take the design job in Chicago or stay in Ohio"));
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
  const ib = imageBackend();
  if (ib === "mock") console.log("SKIP  image model    no image backend (try-on runs in MOCK)");
  else if (ib === "0g") {
    const r = await fetch(`${process.env.ZG_BASE_URL ?? "https://router-api.0g.ai/v1"}/models`, { headers: { Authorization: `Bearer ${process.env.ZG_API_KEY}` } });
    const listed = r.ok && ((await r.json()).data ?? []).some((m: { id: string }) => m.id === imageModel());
    if (listed) console.log(`PASS  image model    0G ${imageModel()} is listed (standard tier: try-on is NOT sealed)`);
    else {
      failures++;
      console.log(`FAIL  image model    0G ${imageModel()} not in /v1/models`);
    }
  } else {
    const r = await fetch(`https://api.openai.com/v1/models/${imageModel()}`, { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } });
    if (r.ok) console.log(`PASS  image model    OpenAI ${imageModel()} is available to this key`);
    else {
      failures++;
      console.log(`FAIL  image model    OpenAI ${imageModel()}: HTTP ${r.status}`);
    }
  }

  console.log(failures ? `\n${failures} problem(s). Fix before the demo (see REHEARSAL.md).` : "\nAll good: every answer came from 0G private mode, reported sealed by the router.");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error("live check crashed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
