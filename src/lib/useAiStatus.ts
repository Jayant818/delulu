"use client";
import { useEffect, useState } from "react";

export type AiStatus = { backends: string[]; zgModel: string; zgTrustMode: string };

// Which AI backend the server is configured for (never secrets). Shared by Decide and Settings.
export function useAiStatus(): AiStatus | undefined {
  const [s, setS] = useState<AiStatus>();
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setS)
      .catch(() => {});
  }, []);
  return s;
}

export const isSealed = (s?: AiStatus) => s?.backends[0] === "0g" && s.zgTrustMode === "private";
