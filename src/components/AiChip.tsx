"use client";
import { useState } from "react";
import type { AiMeta } from "@/lib/memory";

// Small debug chip under every AI answer: which backend answered, the request ID (tap to copy), TEE status.
export function AiChip({ ai }: { ai: AiMeta }) {
  const [copied, setCopied] = useState(false);
  const id = ai.requestId ?? "no-id";
  const label = ai.backend === "0g" ? "0G" : ai.backend === "openai" ? "FALLBACK" : "MOCK";
  const tee = ai.teeVerified === true ? "TEE ✓" : ai.teeVerified === false ? "TEE ✗" : null;
  const tone =
    ai.backend === "0g" && ai.teeVerified !== false ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-900 border-amber-200";

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
