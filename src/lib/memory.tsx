"use client";
// Her memory: profile, chat, decisions. Decrypted only in this tab; IndexedDB holds ciphertext only.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { clear, del, get, set } from "idb-keyval";
import type { AiResult } from "@/lib/ai/provider";
import type { Outcome, Profile, ViewId } from "@/lib/persona";
import type { Job } from "@/lib/schedule";
import { useSession } from "@/lib/session";
import { deriveKey, KEY_MESSAGE, seal, unseal, type Sealed } from "@/lib/vault";

export type AiMeta = Omit<AiResult, "text">;
// kind marks app-made messages that render with buttons (check-back, delete confirm, reminders list).
export type ChatKind = "reminder" | "checkback" | "checkin" | "help" | "privacy" | "confirm-forget" | "reminders";
export type ChatEntry = { role: "user" | "assistant"; content: string; at: string; ai?: AiMeta; decision?: string; kind?: ChatKind; ref?: string };
export type Decision = {
  id: string;
  question: string;
  views: Partial<Record<ViewId, { text: string; ai: AiMeta }>>;
  choice: ViewId;
  at: string;
  checkInAt: string;
  outcome?: Outcome;
};
export type Memory = { profile: Profile | null; chat: ChatEntry[]; decisions: Decision[]; jobs: Job[]; dailyAt: string | null };

const EMPTY: Memory = { profile: null, chat: [], decisions: [], jobs: [], dailyAt: null };
const storeKey = (address: string) => `memory:v1:${address.toLowerCase()}`;

type Vault = {
  status: "locked" | "unlocking" | "unlocked" | "error";
  error?: string;
  memory: Memory;
  update: (fn: (m: Memory) => Memory) => Promise<void>;
  wipe: () => Promise<void>;
};

const Ctx = createContext<Vault | null>(null);
export function useMemoryVault(): Vault {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMemoryVault outside MemoryProvider");
  return v;
}

export function MemoryProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const { address } = session;
  // State is tagged with the address it belongs to; anything else derives to locked/unlocking without a sync setState.
  type S = { for: string; status: "unlocked" | "error"; error?: string; memory: Memory };
  const [state, setState] = useState<S | null>(null);
  const keyRef = useRef<CryptoKey | null>(null);
  const memRef = useRef<Memory>(EMPTY);
  const saving = useRef<Promise<unknown>>(Promise.resolve());
  // Privy's signMessage identity can change every render; a ref keeps unlock from re-running.
  const signRef = useRef(session.sign);
  useEffect(() => {
    signRef.current = session.sign;
  });

  // Unlock as soon as a wallet exists: sign the fixed message -> derive key -> decrypt.
  useEffect(() => {
    keyRef.current = null;
    memRef.current = EMPTY;
    if (!address) return;
    let cancelled = false;
    (async () => {
      try {
        const key = await deriveKey(await signRef.current(KEY_MESSAGE), address);
        const blob = await get<Sealed>(storeKey(address));
        const m: Memory = blob ? { ...EMPTY, ...(await unseal<Partial<Memory>>(key, blob)) } : EMPTY; // older records lack jobs
        if (cancelled) return;
        keyRef.current = key;
        memRef.current = m;
        setState({ for: address, status: "unlocked", memory: m });
      } catch (e) {
        if (!cancelled) setState({ for: address, status: "error", error: (e as Error).message, memory: EMPTY });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const mine = address && state?.for === address ? state : null;
  const status: Vault["status"] = mine?.status ?? (address ? "unlocking" : "locked");
  const memory = mine?.memory ?? EMPTY;

  const update = useCallback(
    async (fn: (m: Memory) => Memory) => {
      const key = keyRef.current;
      if (!key || !address) throw new Error("memory is locked");
      memRef.current = fn(memRef.current);
      const snapshot = memRef.current;
      setState({ for: address, status: "unlocked", memory: snapshot });
      // Writes are chained so a slow encrypt can never overwrite a newer one.
      saving.current = saving.current.then(async () => set(storeKey(address), await seal(key, snapshot)));
      await saving.current;
    },
    [address],
  );

  const wipe = useCallback(async () => {
    await saving.current.catch(() => {});
    if (address) await del(storeKey(address));
    await clear();
    keyRef.current = null;
    memRef.current = EMPTY;
    setState(null);
    await session.logout();
  }, [address, session]);

  return <Ctx.Provider value={{ status, error: mine?.error, memory, update, wipe }}>{children}</Ctx.Provider>;
}
