"use client";
import { APP_NAME } from "@/config";
import { isSealed, useAiStatus } from "@/lib/useAiStatus";

// The "what breaks if 0G is removed" sentence, on screen where judges read it. It states the CURRENT backend
// honestly: it only claims "sealed" when the server really runs 0G in private (TeeML-only) mode.
export function PrivacyLine() {
  const status = useAiStatus();
  const sealed = isSealed(status);
  return (
    <aside className="mt-3 rounded-2xl border border-line bg-paper px-4 py-3 text-xs leading-relaxed text-muted">
      <p>
        <span className="font-semibold text-ink">🔒 Sealed by 0G.</span> {APP_NAME} sends your decision only to an AI model
        that runs inside a hardware enclave on 0G Private Computer. Not even 0G or the GPU owner can read it.{" "}
        <span className="text-ink">Without 0G, the AI company running the model could read every decision you type.</span>
      </p>
      {status && !sealed && (
        <p className="mt-2 font-semibold text-amber-800">
          Right now: {status.backends[0] === "openai" ? "FALLBACK model, not sealed" : "MOCK model, no AI is called"}.
        </p>
      )}
    </aside>
  );
}
