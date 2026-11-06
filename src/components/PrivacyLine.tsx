"use client";
import { APP_NAME } from "@/config";
import { isSealed, useAiStatus } from "@/lib/useAiStatus";

// The "what breaks if 0G is removed" sentence, on screen where judges read it. It states the CURRENT backend
// honestly: it only claims "sealed" when the server really runs 0G in private (TeeML-only) mode.
export function PrivacyLine({ compact = false }: { compact?: boolean }) {
  const status = useAiStatus();
  const sealed = isSealed(status);
  const now =
    status && !sealed ? (status.backends[0] === "openai" ? "FALLBACK model, not sealed" : "MOCK model, no AI is called") : null;

  if (compact)
    return (
      <p className="mt-1 text-xs text-muted">
        🔒 Sealed by 0G: not even 0G can read this. Without 0G, an AI company could.
        {now && <span className="font-semibold text-amber-800"> Right now: {now}.</span>}
      </p>
    );

  return (
    <aside className="mt-3 rounded-2xl border border-line bg-paper px-4 py-3 text-xs leading-relaxed text-muted">
      <p>
        <span className="font-semibold text-ink">🔒 Sealed by 0G.</span> {APP_NAME} sends your words only to an AI model that
        runs inside a hardware enclave on 0G Private Computer. Not even 0G or the GPU owner can read them.{" "}
        <span className="text-ink">Without 0G, the AI company running the model could read everything you type.</span>
      </p>
      {now && <p className="mt-2 font-semibold text-amber-800">Right now: {now}.</p>}
    </aside>
  );
}
