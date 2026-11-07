"use client";
// Her memory: profile, chat, decisions. Decrypted only in this tab; IndexedDB holds ciphertext only.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { clear, del, get, set } from "idb-keyval";
import type { AiResult } from "@/lib/ai/provider";
import { normalizeProfile, type Outcome, type Profile, type ViewId } from "@/lib/persona";
import type { Job } from "@/lib/schedule";
import { useSession } from "@/lib/session";
import { deriveKey, KEY_MESSAGE, seal, unseal, type Sealed } from "@/lib/vault";
import { arkivApi, type ArkivInfo } from "@/lib/arkiv-client";

export type AiMeta = Omit<AiResult, "text">;
// kind marks app-made messages that render with buttons (check-back, delete confirm, reminders list).
export type ChatKind = "reminder" | "checkback" | "checkin" | "help" | "privacy" | "confirm-forget" | "reminders" | "brief";
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
export type Memory = { profile: Profile; chat: ChatEntry[]; decisions: Decision[]; jobs: Job[]; dailyAt: string | null };

const EMPTY: Memory = { profile: { facts: [] }, chat: [], decisions: [], jobs: [], dailyAt: null };
const storeKey = (address: string) => `memory:v1:${address.toLowerCase()}`;

// Encrypted backup on Arkiv. enabled=false (server has no Arkiv key) hides all Arkiv UI.
export type ArkivState = { enabled: boolean; phase: "idle" | "saving" | "saved" | "paused" | "restoring"; info: ArkivInfo | null; offer: boolean; hold: boolean; note?: string };
const ARKIV_OFF: ArkivState = { enabled: false, phase: "idle", info: null, offer: false, hold: false };
const BACKUP_DEBOUNCE_MS = 6000;
const isEmpty = (m: Memory) => !m.chat.length && !m.decisions.length && !m.profile.facts.length;

type Vault = {
  status: "locked" | "unlocking" | "unlocked" | "error";
  error?: string;
  memory: Memory;
  update: (fn: (m: Memory) => Memory) => Promise<void>;
  wipe: () => Promise<void>;
  arkiv: ArkivState;
  backupNow: () => Promise<void>;
  restore: () => Promise<void>;
  replaceBackup: () => void;
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
  const [arkiv, setArkiv] = useState<ArkivState>(ARKIV_OFF);
  const arkivOn = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // gen changes on every wallet switch and on delete: a save or restore from an older gen is dropped.
  const gen = useRef(0);
  // hold: an Arkiv backup exists but this device is empty. Uploads stay off until she restores or confirms a replace.
  const hold = useRef(false);
  const inflight = useRef<Promise<unknown>>(Promise.resolve());
  const closing = useRef(false);
  // Privy's signMessage identity can change every render; a ref keeps unlock from re-running.
  const signRef = useRef(session.sign);
  useEffect(() => {
    signRef.current = session.sign;
  });

  // Unlock as soon as a wallet exists: sign the fixed message -> derive key -> decrypt.
  useEffect(() => {
    keyRef.current = null;
    memRef.current = EMPTY;
    arkivOn.current = false;
    hold.current = false;
    closing.current = false;
    gen.current++;
    if (timer.current) clearTimeout(timer.current);
    if (!address) return;
    let cancelled = false;
    (async () => {
      try {
        // The signature lives only in this expression: it becomes a non-extractable key and is never stored or sent.
        const key = await deriveKey(await signRef.current(KEY_MESSAGE), address);
        const blob = await get<Sealed>(storeKey(address));
        const stored = blob ? await unseal<Partial<Memory>>(key, blob) : {};
        // Older records lack jobs, or hold the 5 setup answers instead of facts: normalize both.
        const m: Memory = { ...EMPTY, ...stored, profile: normalizeProfile(stored.profile) };
        if (cancelled) return;
        keyRef.current = key;
        memRef.current = m;
        setState({ for: address, status: "unlocked", memory: m });
        // Ask Arkiv for her backup. A failure here only hides the feature; the app is already unlocked.
        arkivApi
          .read(address)
          .then((r) => {
            if (cancelled || !r.enabled) return;
            arkivOn.current = true;
            hold.current = !!r.backup && isEmpty(m);
            setArkiv({ enabled: true, phase: r.backup ? "saved" : "idle", info: r.backup, offer: hold.current, hold: hold.current });
          })
          .catch(() => {});
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
      if (arkivOn.current && !hold.current && !closing.current) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void pushRef.current(), BACKUP_DEBOUNCE_MS);
      }
    },
    [address],
  );

  // Seal the CURRENT memory (gzip + AES-GCM, trimmed to 128 KiB), sign its hash, let the server write it to Arkiv.
  const push = useCallback(async () => {
    const key = keyRef.current;
    if (!key || !address || !arkivOn.current || hold.current || closing.current) return;
    const g = gen.current;
    setArkiv((a) => ({ ...a, phase: "saving", note: undefined }));
    // Saves run one at a time, and wipe waits for the running one before it deletes.
    const run = inflight.current.then(async () => {
      if (g !== gen.current || closing.current) return;
      try {
        const { info, trimmed } = await arkivApi.save(key, memRef.current, address, (m) => signRef.current(m));
        if (g === gen.current) setArkiv((a) => ({ ...a, phase: "saved", info, note: trimmed ? `${trimmed} oldest chat messages left out to fit 128 KiB` : undefined }));
      } catch {
        if (g === gen.current) setArkiv((a) => ({ ...a, phase: "paused" }));
      }
    });
    inflight.current = run;
    await run;
  }, [address]);
  const pushRef = useRef(push);
  useEffect(() => {
    pushRef.current = push;
  });

  const restore = useCallback(async () => {
    const key = keyRef.current;
    if (!key || !address) throw new Error("memory is locked");
    const g = gen.current;
    setArkiv((a) => ({ ...a, phase: "restoring" }));
    try {
      const stored = await arkivApi.fetchMemory<Partial<Memory>>(key, address);
      if (g !== gen.current) return; // another wallet unlocked meanwhile: do not touch its state
      const m: Memory = { ...EMPTY, ...stored, profile: normalizeProfile(stored.profile) };
      memRef.current = m;
      setState({ for: address, status: "unlocked", memory: m });
      saving.current = saving.current.then(async () => set(storeKey(address), await seal(key, m)));
      await saving.current;
      if (g !== gen.current) return;
      hold.current = false; // her memory now matches Arkiv: normal saves may resume
      setArkiv((a) => ({ ...a, phase: "saved", offer: false, hold: false, note: "Restored from Arkiv." }));
    } catch (e) {
      if (g === gen.current) setArkiv((a) => ({ ...a, phase: "paused", note: (e as Error).message }));
      throw e;
    }
  }, [address]);

  // She chose to overwrite the Arkiv backup with this device's (empty or new) memory.
  const replaceBackup = useCallback(() => {
    hold.current = false;
    setArkiv((a) => ({ ...a, offer: false, hold: false, note: "The next save will replace your Arkiv backup." }));
  }, []);

  const wipe = useCallback(async () => {
    await saving.current.catch(() => {});
    if (timer.current) clearTimeout(timer.current);
    // Stop new saves, drop any queued one, and wait for the running one, so none can land after the delete.
    closing.current = true;
    gen.current++;
    await inflight.current.catch(() => {});
    // "Delete everything" also deletes her Arkiv entity (signed by her). We always try, even if the first read failed (the server
    // says enabled:false when Arkiv is off). On failure we stop BEFORE erasing anything, so the screen never claims a false success.
    if (address) {
      try {
        await arkivApi.remove(address, (m) => session.sign(m));
      } catch (e) {
        closing.current = false;
        throw new Error(`Could not delete your Arkiv backup (${(e as Error).message}). Nothing was deleted. Try again.`);
      }
    }
    arkivOn.current = false;
    if (address) await del(storeKey(address));
    await clear();
    keyRef.current = null;
    memRef.current = EMPTY;
    setState(null);
    setArkiv(ARKIV_OFF);
    await session.logout();
  }, [address, session]);

  return <Ctx.Provider value={{ status, error: mine?.error, memory, update, wipe, arkiv: mine ? arkiv : ARKIV_OFF, backupNow: push, restore, replaceBackup }}>{children}</Ctx.Provider>;
}
