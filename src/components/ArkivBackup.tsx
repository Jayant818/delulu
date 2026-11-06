"use client";
import { useState } from "react";
import { arkivLine, ARKIV_PUBLIC_NOTE } from "@/lib/arkiv-ui";
import { useMemoryVault } from "@/lib/memory";

// Settings card. Renders nothing when the server has no Arkiv key.
export function ArkivBackupCard() {
  const { arkiv, backupNow, restore } = useMemoryVault();
  const [confirm, setConfirm] = useState(false);
  const line = arkivLine(arkiv);
  if (!line) return null;
  const busy = arkiv.phase === "saving" || arkiv.phase === "restoring";
  return (
    <section className="rounded-2xl border border-line bg-paper p-4 text-sm">
      <h2 className="font-semibold">Encrypted backup on Arkiv</h2>
      <p className="mt-1 text-muted">
        {line.text}
        {line.href && (
          <>
            {" "}
            <a href={line.href} target="_blank" rel="noreferrer" className="underline">
              View on Arkiv explorer
            </a>
          </>
        )}
      </p>
      <p className="mt-2 text-xs text-muted">{ARKIV_PUBLIC_NOTE}</p>
      {arkiv.note && <p className="mt-2 text-xs text-ink">{arkiv.note}</p>}
      <div className="mt-3 flex gap-2">
        {arkiv.phase === "paused" && (
          <button onClick={() => void backupNow()} className="rounded-xl bg-accent px-4 py-2 font-semibold text-ink">
            Retry backup
          </button>
        )}
        {arkiv.info && !confirm && (
          <button onClick={() => setConfirm(true)} disabled={busy} className="rounded-xl bg-accent px-4 py-2 font-semibold text-ink disabled:opacity-50">
            Restore from Arkiv
          </button>
        )}
        {confirm && (
          <button
            onClick={() => {
              setConfirm(false);
              void restore().catch(() => {});
            }}
            className="rounded-xl bg-accent px-4 py-2 font-semibold text-ink"
          >
            Replace this device&apos;s memory
          </button>
        )}
      </div>
    </section>
  );
}

// Shown once after unlock when this device has no memory but Arkiv holds a backup.
export function ArkivRestoreOffer() {
  const { arkiv, restore } = useMemoryVault();
  const [dismissed, setDismissed] = useState(false);
  if (!arkiv.enabled || !arkiv.offer || dismissed) return null;
  return (
    <div className="mb-4 rounded-2xl border border-line bg-accent-soft p-4 text-sm">
      <p className="font-semibold">Found your encrypted backup on Arkiv.</p>
      <p className="mt-1 text-muted">This device has no memory yet. Restore your chats and decisions? {ARKIV_PUBLIC_NOTE}</p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => void restore().catch(() => {})} disabled={arkiv.phase === "restoring"} className="rounded-xl bg-accent px-4 py-2 font-semibold text-ink disabled:opacity-50">
          {arkiv.phase === "restoring" ? "Restoring…" : "Restore"}
        </button>
        <button onClick={() => setDismissed(true)} className="rounded-xl border border-line px-4 py-2">
          Not now
        </button>
      </div>
      {arkiv.phase === "paused" && arkiv.note && <p className="mt-2 text-xs text-red-700">{arkiv.note}</p>}
    </div>
  );
}
