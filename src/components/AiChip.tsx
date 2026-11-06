"use client";
import { useState } from "react";
import { isSealedAnswer, sealLabel } from "@/lib/ai/labels";
import type { AiMeta } from "@/lib/memory";

// The proof under every AI answer: which backend answered, its 0G request ID (tap to copy) and the seal status.
// Green only when the 0G router reports the answer sealed; MOCK / FALLBACK are amber so a demo can never pass as 0G.
export function AiChip({ ai }: { ai: AiMeta }) {
  const [copied, setCopied] = useState(false);
  const id = ai.requestId ?? "no-id";
  const label = ai.backend === "0g" ? "0G" : ai.backend === "openai" ? "FALLBACK" : "MOCK";
  const tee = ai.backend === "0g" ? sealLabel(ai) : null;
  const tone = isSealedAnswer(ai) ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-900 border-amber-200";

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(id).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      title={`${ai.model}${ai.provider ? ` · provider ${ai.provider}` : ""}${ai.fallbackReason ? ` · 0G failed: ${ai.fallbackReason}` : ""}`}
      className={`mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] ${tone}`}
    >
      <span className="font-semibold">{label}</span>
      <span className="truncate">{copied ? "copied" : `req ${id.slice(0, 8)}…`}</span>
      {tee && <span>{tee}</span>}
    </button>
  );
}
