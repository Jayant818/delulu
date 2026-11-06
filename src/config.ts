// The product name lives here and only here. Rename the app by changing this one constant.
// Storage keys and the key-derivation message do NOT use it, so a rename never locks anyone out of their memory.
export const APP_NAME = "Delulu";

// Telegram bot username (no @). Unset = the landing page says the link is coming, instead of showing a fake one.
export const TELEGRAM_BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT?.trim().replace(/^@/, "") || null;
export const TELEGRAM_URL = TELEGRAM_BOT ? `https://t.me/${TELEGRAM_BOT}` : null;

// Web app check-back delay. NEXT_PUBLIC_DEMO_FAST=1 -> 1 minute for the demo video; tests can set an exact ms value.
export const CHECKBACK_MS =
  Number(process.env.NEXT_PUBLIC_CHECKBACK_MS) || (process.env.NEXT_PUBLIC_DEMO_FAST === "1" ? 60_000 : 30 * 86_400_000);
export const DEMO_FAST = process.env.NEXT_PUBLIC_DEMO_FAST === "1";
