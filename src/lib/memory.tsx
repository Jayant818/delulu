"use client";
// Her memory: profile, chat, decisions. Decrypted only in this tab; IndexedDB holds ciphertext only.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { clear, del, get, set } from "idb-keyval";
import type { AiResult } from "@/lib/ai/provider";
import type { Profile, ViewId } from "@/lib/persona";
import { useSession } from "@/lib/session";
import { deriveKey, KEY_MESSAGE, seal, unseal, type Sealed } from "@/lib/vault";

export type AiMeta = Omit<AiResult, "text">;
export type ChatEntry = { role: "user" | "assistant"; content: string; at: string; ai?: AiMeta };
export type Decision = {
  id: string;
  question: string;
  views: Partial<Record<ViewId, { text: string; ai: AiMeta }>>;
  choice: ViewId;
  at: string;
  checkInAt: string;
};
export type Memory = { profile: Profile | null; chat: ChatEntry[]; decisions: Decision[] };

const EMPTY: Memory = { profile: null, chat: [], decisions: [] };
const storeKey = (address: string) => `tara:memory:v1:${address.toLowerCase()}`;

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
  const [status, setStatus] = useState<Vault["status"]>("locked");
  const [error, setError] = useState<string>();
  const [memory, setMemory] = useState<Memory>(EMPTY);
  const keyRef = useRef<CryptoKey | null>(null);
  const memRef = useRef<Memory>(EMPTY);
  const saving = useRef<Promise<unknown>>(Promise.resolve());
  const { address } = session;
  // Privy's signMessage identity can change every render; a ref keeps unlock from re-running.
  const signRef = useRef(session.sign);
  signRef.current = session.sign;

  // Unlock as soon as a wallet exists: sign the fixed message -> derive key -> decrypt.
  useEffect(() => {
    if (!address) {
      keyRef.current = null;
      memRef.current = EMPTY;
      setMemory(EMPTY);
      setStatus("locked");
      return;
    }
    let cancelled = false;
    (async () => {
      setStatus("unlocking");
      try {
        const key = await deriveKey(await signRef.current(KEY_MESSAGE), address);
        const blob = await get<Sealed>(storeKey(address));
        const m = blob ? await unseal<Memory>(key, blob) : EMPTY;
        if (cancelled) return;
        keyRef.current = key;
        memRef.current = m;
        setMemory(m);
        setStatus("unlocked");
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const update = useCallback(
    async (fn: (m: Memory) => Memory) => {
      const key = keyRef.current;
      if (!key || !address) throw new Error("memory is locked");
      memRef.current = fn(memRef.current);
      setMemory(memRef.current);
      const snapshot = memRef.current;
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
    setMemory(EMPTY);
    await session.logout();
  }, [address, session]);

  return <Ctx.Provider value={{ status, error, memory, update, wipe }}>{children}</Ctx.Provider>;
}
