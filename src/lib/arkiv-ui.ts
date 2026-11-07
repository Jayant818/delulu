// What the Arkiv backup line says. Pure, so a test can prove the feature-flag-off case renders nothing.
import type { ArkivInfo } from "./arkiv-client";

type View = { enabled: boolean; phase: "idle" | "saving" | "saved" | "paused" | "restoring"; info: ArkivInfo | null };

export const ARKIV_PUBLIC_NOTE =
  "Arkiv is a public network. Anyone who knows your wallet address can fetch the locked blob and see the save times. Nobody can read your words without your key.";

export function arkivLine(a: View, now = Date.now()): { text: string; href?: string } | null {
  if (!a.enabled) return null;
  if (a.phase === "paused") return { text: "Backup paused. It retries on your next change.", href: a.info?.explorer };
  if (a.phase === "saving") return { text: "Saving encrypted backup on Arkiv…" };
  if (!a.info) return { text: "No backup on Arkiv yet. It saves a few seconds after your next message." };
  const days = Math.max(0, Math.round((a.info.expiresAt - now) / 86_400_000));
  const short = `${a.info.key.slice(0, 6)}…${a.info.key.slice(-4)}`;
  const saved = new Date(a.info.updatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  return { text: `Encrypted backup on Arkiv · entity ${short} · saved ${saved} · expires in ${days} days`, href: a.info.explorer };
}
