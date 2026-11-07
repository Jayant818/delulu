"use client";
// Talk: "Tell Delulu anything". Free chat with memory, sealed on 0G. No commands: the model routes requests
// (help, privacy, delete, check-ins, reminders, "help me decide") and the app performs them (src/lib/assistant.ts).
// Check-backs, reminders and check-ins appear here when they are due (in-app; no web push).
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useEffect, useRef, useState } from "react";
import { Mark } from "@/components/Mark";
import { Bubble, pill } from "@/components/chat/Bubble";
import { DecisionCard } from "@/components/chat/DecisionCard";
import { PhotoTurn, type Photo, type StylePrompt } from "@/components/chat/PhotoTurn";
import { trackEvent } from "@/components/SiteAnalytics";
import { APP_NAME, DEMO_FAST } from "@/config";
import { sealLabel } from "@/lib/ai/labels";
import { aiMeta, chatLines, decisionSummaries, postAi } from "@/lib/api";
import { answerCheckback, applyChatResult } from "@/lib/assistant";
import { useMemoryVault, type ChatEntry, type Memory } from "@/lib/memory";
import { photoConsent, shrink, type TryonInfo } from "@/lib/tryon-client";
import { isSealed, useAiStatus } from "@/lib/useAiStatus";
import "./chat.css";
import { OUTCOMES, whenIST } from "@/lib/schedule";

const STARTERS = ["Something happened today…", "I can't decide if I should…", "What can you do?"];

/** The extra controls an app-made message carries (check-back answers, delete confirm, reminders list, proof). */
function Extras({ e, i, m }: { e: ChatEntry; i: number; m: Memory }) {
  const vault = useMemoryVault();
  const router = useRouter();
  const answeredLater = m.chat.slice(i + 1).some((x) => x.role === "user"); // buttons only until she moves on

  if (e.kind === "checkback" && e.ref) {
    const d = m.decisions.find((x) => x.id === e.ref);
    if (!d || d.outcome) return d?.outcome ? <p className="mt-2 text-xs text-muted">Answered: {OUTCOMES.find((o) => o.key === d.outcome)?.label}</p> : null;
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {OUTCOMES.map((o) => (
          <button key={o.key} className={pill} onClick={() => vault.update((mm) => answerCheckback(mm, d.id, o.key, Date.now()))}>
            {o.label}
          </button>
        ))}
      </div>
    );
  }
  if (e.kind === "confirm-forget" && !answeredLater)
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          className="min-h-11 rounded-full bg-accent px-4 text-sm font-semibold text-ink"
          onClick={async () => {
            await vault.wipe();
            router.replace("/app");
          }}
        >
          Yes, delete everything
        </button>
        <button
          className={pill}
          onClick={() =>
            vault.update((mm) => ({
              ...mm,
              chat: [
                ...mm.chat,
                { role: "user", content: "No, keep it", at: new Date().toISOString() },
                { role: "assistant", content: "Okay, keeping everything 💛", at: new Date().toISOString() },
              ],
            }))
          }
        >
          No, keep it
        </button>
      </div>
    );
  if (e.kind === "reminders") {
    const rs = m.jobs.filter((j) => j.kind === "reminder").sort((a, b) => a.at.localeCompare(b.at));
    if (!rs.length) return <p className="mt-2 text-sm text-muted">No reminders right now. Just tell me, like “remind me Sunday 6pm to call Mom”.</p>;
    return (
      <ul className="mt-2 space-y-1.5">
        {rs.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
            <span>
              ⏰ {r.text} · {whenIST(r.at)}
            </span>
            <button className={pill} onClick={() => vault.update((mm) => ({ ...mm, jobs: mm.jobs.filter((j) => j.id !== r.id) }))}>
              Cancel
            </button>
          </li>
        ))}
      </ul>
    );
  }
  if (e.kind === "privacy") {
    const proofs = m.chat.filter((x) => x.ai).slice(-10);
    if (!proofs.length) return null;
    return (
      <ul className="mt-2 space-y-1 font-mono text-[11px] text-muted">
        {proofs.map((p, k) => (
          <li key={k}>
            {p.ai!.backend === "0g" ? `0G ${p.ai!.model}` : p.ai!.backend === "openai" ? "fallback (not sealed)" : "MOCK"} · {p.ai!.requestId ?? "no-id"} ·{" "}
            {sealLabel(p.ai!)}
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

// useSearchParams needs a Suspense boundary.
export default function TalkPage() {
  return (
    <Suspense>
      <Talk />
    </Suspense>
  );
}

function Talk() {
  const vault = useMemoryVault();
  const router = useRouter();
  const status = useAiStatus();
  const m = vault.memory;
  const { chat, decisions } = m;
  const draft = useSearchParams().get("draft")?.slice(0, 2000) ?? "";
  const [text, setText] = useState(draft);
  useEffect(() => {
    if (draft) router.replace("/app", { scroll: false });
  }, [draft, router]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; retry?: string }>();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pending, setPending] = useState<Photo>();
  const [reading, setReading] = useState(false);
  const [stylePrompt, setStylePrompt] = useState<StylePrompt | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const urls = useRef(new Set<string>());
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const request = new AbortController();
    controller.current = request;
    const ownedUrls = urls.current;
    return () => {
      request.abort();
      ownedUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    // iOS Safari uses the visual viewport when its keyboard covers the layout viewport.
    const viewport = window.visualViewport;
    const resize = () => {
      panel.current?.style.setProperty("--chat-height", `${viewport?.height ?? window.innerHeight}px`);
      panel.current?.style.setProperty("--chat-top", `${viewport?.offsetTop ?? 0}px`);
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    const observer = new ResizeObserver(() => {
      scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    });
    if (thread.current) observer.observe(thread.current);
    return () => {
      observer.disconnect();
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
    };
  }, []);

  async function onFile(f?: File) {
    if (!f || reading) return;
    setReading(true);
    setError(undefined);
    try {
      const [blob, info] = await Promise.all([
        shrink(f),
        fetch("/api/tryon", { signal: controller.current?.signal }).then(async (r) => {
          if (!r.ok) throw new Error("Couldn't check the photo provider. Please attach your photo again.");
          return await r.json() as TryonInfo;
        }),
      ]);
      if (controller.current?.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      urls.current.add(url);
      setPending({ id: crypto.randomUUID(), blob, url, at: new Date().toISOString(), info });
    } catch {
      if (!controller.current?.signal.aborted) setError({ text: "Couldn't prepare that photo or check its provider. Please try attaching a JPEG or PNG again." });
    } finally {
      setReading(false);
    }
  }

  function cancelPhoto() {
    if (pending) {
      URL.revokeObjectURL(pending.url);
      urls.current.delete(pending.url);
    }
    setPending(undefined);
  }

  async function send(retry?: string) {
    const message = (retry ?? text).trim();
    if (!message || busy || pending) return;
    if (stylePrompt && !retry) {
      stylePrompt.submit(message);
      setStylePrompt(null);
      setText("");
      return;
    }
    if (vault.memory.chat.length === 0) trackEvent("app_first_message");
    setText("");
    setError(undefined);
    setBusy(true);
    const history = chatLines(vault.memory, 20);
    // A retry reuses the existing user bubble and the history before that message.
    if (retry && history.at(-1)?.role === "user" && history.at(-1)?.content === retry) history.pop();
    try {
      if (!retry) await vault.update((mm) => ({ ...mm, chat: [...mm.chat, { role: "user", content: message, at: new Date().toISOString() }] }));
      const r = await postAi("/api/chat", { profile: vault.memory.profile, decisions: decisionSummaries(vault.memory), history, message }, controller.current?.signal);
      if (controller.current?.signal.aborted) return;
      await vault.update((mm) => applyChatResult(mm, r, aiMeta(r), Date.now(), DEMO_FAST).memory);
    } catch (e) {
      if (!controller.current?.signal.aborted) setError({ text: `Couldn't get a reply. ${(e as Error).message}`, retry: message });
    } finally {
      setBusy(false);
    }
  }

  const timeline = [
    ...chat.map((entry, i) => ({ at: entry.at, key: `message-${i}`, entry, i, photo: undefined as Photo | undefined })),
    ...photos.map((photo) => ({ at: photo.at, key: photo.id, entry: undefined, i: -1, photo })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const dateLabel = (at: string) => new Date(at).toDateString() === new Date().toDateString() ? "Today" : new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "long" });

  return (
    <div ref={panel} className="delulu-chat">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-paper px-4 pb-3 pt-[max(.75rem,env(safe-area-inset-top))]">
        <Link href="/settings" aria-label="Delulu settings" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream"><Mark size={30} /></Link>
        <div className="min-w-0">
          <h1 className="font-serif text-2xl leading-tight">{APP_NAME}</h1>
          <p className="text-[11px] text-muted">{!status ? "Your AI companion" : isSealed(status) ? "Chat on 0G · private TEE mode" : status.backends[0] === "mock" ? "MOCK demo · no AI model connected" : "Fallback AI · not sealed"}</p>
        </div>
        <Link href="/tryon" className="ml-auto flex min-h-11 items-center text-xs underline underline-offset-4">Try-on</Link>
      </header>
      <div ref={scroll} className={`delulu-chat-wallpaper min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3`} aria-label="Chat messages">
        <div ref={thread} className="space-y-2.5">
          {timeline.length === 0 && <>
            <p className="text-center text-[11px] text-muted">Today</p>
            <Bubble><p>What&apos;s on your mind? Big or small, I&apos;m listening.</p><p className="mt-1 text-xs text-muted">Talk it through, hear three perspectives, or attach a photo to try a look.</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{STARTERS.map((s) => <button key={s} onClick={() => { setText(s); input.current?.focus(); }} className={pill}>{s}</button>)}</div>
            </Bubble>
          </>}
          {timeline.map(({ entry: e, i, photo, at, key }, n) => <Fragment key={key}>
            {(n === 0 || dateLabel(timeline[n - 1].at) !== dateLabel(at)) && <p className="py-1 text-center text-[11px] text-muted">{dateLabel(at)}</p>}
            {photo ? <PhotoTurn photo={photo} onPrompt={(prompt) => { setStylePrompt(prompt); if (prompt) input.current?.focus(); }} /> : e && <Bubble user={e.role === "user"} at={e.at} ai={e.ai}>
              <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{e.content}</p>
              {e.decision && <DecisionCard summary={e.decision} decided={decisions.find((d) => d.question === e.decision)} />}
              <Extras e={e} i={i} m={m} />
            </Bubble>}
          </Fragment>)}
          {busy && <Bubble><p role="status" className="animate-pulse text-sm text-muted">{APP_NAME} is thinking…</p></Bubble>}
          {reading && <Bubble><p role="status" className="text-sm text-muted">Preparing your photo on this device…</p></Bubble>}
          {error && <Bubble><p role="alert">{error.text}</p>{error.retry && <button disabled={busy} className={`${pill} mt-2`} onClick={() => send(error.retry)}>Try again</button>}</Bubble>}
        </div>
      </div>
      {pending && <section role="dialog" onKeyDown={(e) => { if (e.key === "Escape") cancelPhoto(); }} aria-label="Send photo" aria-describedby="photo-consent" className="max-h-[55%] shrink-0 overflow-y-auto border-t border-line bg-paper p-3">
        <div className="flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pending.url} alt="Photo ready to send" className="h-20 w-20 rounded-xl object-cover" />
          <p id="photo-consent" className="text-xs leading-relaxed text-muted">{photoConsent(pending.info.backend, "Send")}</p>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button autoFocus onClick={cancelPhoto} className={pill}>Cancel</button>
          <button onClick={() => { setPhotos((p) => [...p, { ...pending, at: new Date().toISOString() }]); setPending(undefined); setStylePrompt(null); }} className="min-h-11 rounded-full bg-accent px-6 text-sm font-semibold">Send</button>
        </div>
      </section>}
      {stylePrompt && <div className="flex items-center justify-between gap-2 bg-paper px-4 text-xs"><span>Describe your {stylePrompt.label.toLowerCase()} look</span><button className="min-h-11 underline" onClick={() => { setStylePrompt(null); setText(""); }}>Back to chat</button></div>}
      <form onSubmit={(ev) => { ev.preventDefault(); send(); }} className="flex shrink-0 items-center gap-2 border-t border-line bg-cream px-3 py-2">
        <input ref={file} type="file" accept="image/*" className="sr-only" aria-label="Attach a photo" onChange={(ev) => { onFile(ev.target.files?.[0]); ev.target.value = ""; }} />
        <button type="button" disabled={reading || !!pending} aria-label="Add photo" onClick={() => file.current?.click()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper disabled:opacity-50">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m8 12 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9a6 6 0 0 1 8 8l-9 9" /></svg>
        </button>
        <input ref={input} autoFocus aria-label={stylePrompt ? "Describe your look" : "Message Delulu"} value={text} maxLength={stylePrompt ? 120 : 2000} onChange={(ev) => setText(ev.target.value)} placeholder={stylePrompt ? "Describe your look…" : "Tell me anything…"} className="min-h-11 min-w-0 flex-1 rounded-full border border-line bg-paper px-4 py-2.5 text-base outline-none focus:border-ink" />
        <button disabled={!text.trim() || busy || !!pending} aria-label="Send message" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-ink disabled:bg-line disabled:text-muted">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m4 12 16-8-6 16-3-7-7-1Z M11 13l9-9" /></svg>
        </button>
      </form>
    </div>
  );
}
