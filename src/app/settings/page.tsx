"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

  const { chat, decisions } = vault.memory;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">Settings</h1>

      <section className="rounded-2xl border border-line bg-paper p-4 text-sm">
        <h2 className="font-semibold">Your private memory</h2>
        <p className="mt-1 text-muted">
          {chat.length} messages · {decisions.length} decisions. Encrypted on this device (AES-GCM) with a key made from your
          wallet signature. Nothing is stored on a server.
        </p>
        <p className="mt-3 break-all font-mono text-xs">
          Wallet ({session.mode === "privy" ? "embedded" : "DEV"}): {session.address}
        </p>
      </section>

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
          router.replace("/");
        }}
        disabled={wiping}
        className="w-full rounded-2xl bg-red-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
      >
        {wiping ? "Deleting…" : "Delete everything"}
      </button>
      <p className="text-center text-xs text-muted">
        Deletes your profile, chats and decisions from this device and logs you out of {APP_NAME}. One tap, no undo.
      </p>
    </div>
  );
}
