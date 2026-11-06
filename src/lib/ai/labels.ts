// One honest wording for "is this answer sealed?", shared by the web chips, the bot footer and the proof lists.
import type { AiResult } from "@/lib/ai/provider";

type Meta = Pick<AiResult, "backend" | "teeVerified" | "sealed">;

/** "TEE ✓" only when the router verified the enclave signature; "sealed" when it reports end-to-end sealing. */
export function sealLabel(ai: Meta): string {
  if (ai.backend !== "0g") return ai.backend === "openai" ? "not sealed" : "MOCK";
  if (ai.teeVerified === true) return "TEE ✓";
  if (ai.teeVerified === false) return "TEE ✗";
  return ai.sealed ? "sealed" : "no seal reported";
}

/** Green only for a 0G answer the router reports as sealed or TEE-verified. */
export const isSealedAnswer = (ai: Meta) => ai.backend === "0g" && ai.teeVerified !== false && (ai.teeVerified === true || ai.sealed === true);
