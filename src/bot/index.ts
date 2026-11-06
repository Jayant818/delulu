// Run: npm run bot   (reads .env.local: TELEGRAM_BOT_TOKEN, BOT_MASTER_KEY, ZG_API_KEY)
import path from "node:path";
import { configuredBackends } from "@/lib/ai/provider";
import { createBot } from "./bot";
import { BotStore } from "./store";

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN missing in .env.local (create the bot at @BotFather).");
  process.exit(1);
}

const store = new BotStore(path.resolve(process.env.BOT_DATA_DIR ?? "data/bot"), process.env.BOT_MASTER_KEY ?? "");
const bot = createBot(token, {
  store,
  dailyLimit: Number(process.env.BOT_DAILY_LIMIT ?? 150),
  // DEMO_FAST=1: the 30-day check-back date becomes 1 minute, for the demo video.
  checkBackMs: process.env.DEMO_FAST === "1" ? 60_000 : undefined,
});

async function main() {
  await bot.api.setMyCommands([
    { command: "decide", description: "Three views on a decision" },
    { command: "proof", description: "0G request IDs behind my answers" },
    { command: "privacy", description: "What happens to your data" },
    { command: "forget", description: "Delete everything about you" },
    { command: "start", description: "Redo the 5 setup questions" },
  ]);
  console.log(`[bot] @${(await bot.api.getMe()).username} running (long polling). AI backends: ${configuredBackends().join(" -> ")}. No message content is logged.`);
  process.once("SIGINT", () => bot.stop());
  process.once("SIGTERM", () => bot.stop());
  await bot.start();
}

main().catch((e) => {
  console.error("[bot] fatal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
