"use client";
import { useEffect, useRef, useState } from "react";
import { aiMeta, postAi } from "@/lib/api";
import { useMemoryVault } from "@/lib/memory";
import { useSession } from "@/lib/session";
import type { TryonKind } from "@/lib/tryon";
import type { TryonInfo, TryonResult } from "@/lib/tryon-client";
import { Bubble, pill } from "./Bubble";

export type Photo = { id: string; blob: Blob; url: string; at: string; info: TryonInfo };
export type StylePrompt = { id: string; label: string; submit: (style: string) => void };
const KINDS = ["Haircut", "Nails", "Hair color"] as const;
type Look = typeof KINDS[number];

export function PhotoTurn({ photo, onPrompt }: { photo: Photo; onPrompt: (prompt: StylePrompt | null) => void }) {
  const vault = useMemoryVault();
  const session = useSession();
  const [look, setLook] = useState<Look>();
  const [style, setStyle] = useState("");
  const [sentAt, setSentAt] = useState(photo.at);
  const [result, setResult] = useState<TryonResult & { at: string }>();
  const [phase, setPhase] = useState<"choose" | "image" | "brief" | "done">("choose");
  const [error, setError] = useState<string>();
  const controller = useRef<AbortController | null>(null);
  const running = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  const kind: TryonKind = look === "Nails" ? "nails" : "hair";
  const presets = photo.info.presets[kind].filter((p) => kind === "nails" || (/copper|balayage/i.test(p) === (look === "Hair color")));

  async function make(chosen: string) {
    const trimmed = chosen.trim().slice(0, 120);
    if (!trimmed || running.current) return;
    running.current = true;
    onPrompt(null);
    if (!style) setSentAt(new Date().toISOString());
    setStyle(trimmed);
    setError(undefined);
    const request = new AbortController();
    controller.current = request;
    try {
      // A failed brief retries only the text call, never spends another image reservation.
      if (!result) {
        setPhase("image");
        const form = new FormData();
        form.set("kind", kind);
        form.set("style", trimmed);
        form.set("address", session.address ?? "");
        form.set("image", photo.blob, "photo.jpg");
        const res = await fetch("/api/tryon", { method: "POST", body: form, signal: request.signal });
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        if (request.signal.aborted) return;
        setResult({ ...data, at: new Date().toISOString() });
      }
      setPhase("brief");
      const b = await postAi("/api/brief", { profile: vault.memory.profile, kind, style: trimmed }, request.signal);
      if (request.signal.aborted) return;
      const label = kind === "hair" ? "Stylist brief" : "Nail artist brief";
      await vault.update((m) => ({ ...m, chat: [...m.chat, { role: "assistant", content: `${label}: ${trimmed}\n${b.text}`, at: new Date().toISOString(), ai: aiMeta(b), kind: "brief" }] }));
      setPhase("done");
    } catch (e) {
      if (!request.signal.aborted) setError((e as Error).message);
    } finally {
      running.current = false;
    }
  }

  function pick(next: Look) {
    setLook(next);
    onPrompt(null);
  }

  return (
    <div className="space-y-2" aria-label="Photo try-on">
      <Bubble user at={photo.at}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt="Your photo" className="max-h-64 w-full rounded-xl object-contain" />
      </Bubble>
      {phase === "choose" && <Bubble at={photo.at}>
        <p>{look ? "Pick a look, or describe your own." : "What are we trying? For nails, use a photo of your hand."}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {KINDS.map((k) => <button key={k} aria-pressed={look === k} className={`${pill} ${look === k ? "border-ink" : ""}`} onClick={() => pick(k)}>{k}</button>)}
        </div>
        {look && <>
          <div className="mt-2 flex flex-wrap gap-1.5">{presets.map((p) => <button key={p} className={pill} onClick={() => make(p)}>{p}</button>)}</div>
          <button className={`${pill} mt-2`} onClick={() => onPrompt({ id: photo.id, label: look, submit: make })}>Describe a look</button>
        </>}
        <p className="mt-2 text-[11px] text-muted">Demo limit: {photo.info.caps.user} try-ons per person / day, {photo.info.caps.total} total. Photos disappear when you leave this chat.</p>
      </Bubble>}
      {style && <Bubble user at={sentAt}><p>{look}: {style}</p></Bubble>}
      {result && <Bubble at={result.at} ai={{ backend: result.backend, model: result.model, requestId: result.requestId, provider: null, teeVerified: null, sealed: false, costUsd: null }}>
        <p className="mb-2 text-xs font-semibold">AI preview{result.mock ? " · MOCK: original photo, unchanged" : " · not sealed"}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={result.image} alt="AI preview" className="max-h-80 w-full rounded-xl object-contain" />
      </Bubble>}
      {!error && (phase === "image" || phase === "brief") && <Bubble><p role="status" className="animate-pulse text-sm text-muted">{phase === "image" ? "Making your AI preview…" : "Writing your brief…"}</p></Bubble>}
      {error && <Bubble><p role="alert">{result ? "Your preview is ready, but the brief couldn't finish." : "That preview couldn't finish."} {error}</p><button className={`${pill} mt-2`} onClick={() => make(style)}>Try again</button></Bubble>}
    </div>
  );
}
