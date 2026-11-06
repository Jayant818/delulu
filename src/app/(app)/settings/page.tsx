"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArkivBackupCard } from "@/components/ArkivBackup";
import { APP_NAME } from "@/config";
import { useMemoryVault } from "@/lib/memory";
import { useSession } from "@/lib/session";
import { useAiStatus } from "@/lib/useAiStatus";

export default function Settings() {
  const session = useSession();
  const vault = useMemoryVault();
  const router = useRouter();
  const status = useAiStatus();
  const [wiping, setWiping] = useState(false);

  const { chat, decisions, profile } = vault.memory;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">Settings</h1>

      <section className="rounded-2xl border border-line bg-paper p-4 text-sm">
        <h2 className="font-semibold">Your private memory</h2>
        <p className="mt-1 text-muted">
          {chat.length} messages · {decisions.length} decisions · {profile.facts.length} {profile.facts.length === 1 ? "thing" : "things"} it knows about you. Encrypted on
          this device (AES-GCM) with a key made from your wallet signature. Nothing is stored on a server.
        </p>
        {profile.facts.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer font-semibold text-ink">What {APP_NAME} knows about you</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              {profile.facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </details>
        )}
        <p className="mt-3 break-all font-mono text-xs">
          Wallet ({session.mode === "privy" ? "embedded" : "DEV"}): {session.address}
        </p>
      </section>

      <ArkivBackupCard />

      <section className="rounded-2xl border border-line bg-paper p-4 text-sm">
        <h2 className="font-semibold">AI</h2>
        <p className="mt-1 text-muted">
          {status
            ? status.backends[0] === "0g"
              ? `0G Private Computer · ${status.zgModel} · trust mode ${status.zgTrustMode}${status.backends.includes("openai") ? " · fallback ready" : ""}`
              : status.backends[0] === "openai"
                ? "OpenAI-compatible fallback (0G key not set)"
                : "MOCK: no model configured"
            : "…"}
        </p>
      </section>

      <button
        onClick={async () => {
          setWiping(true);
          await vault.wipe();
          router.replace("/app");
        }}
        disabled={wiping}
        className="w-full rounded-2xl bg-red-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
      >
        {wiping ? "Deleting…" : "Delete everything"}
      </button>
      <p className="text-center text-xs text-muted">
        Deletes what it knows about you, your chats and decisions from this device (and your Arkiv backup, if you made one), and {APP_NAME} starts fresh. One tap, no undo.
      </p>
    </div>
  );
}
