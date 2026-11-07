"use client";
// Try-on: hair (selfie) or nails (photo of her hand) -> a style -> the look via the image model (0G by default) ->
// Delulu's three voices on it (0G) -> a stylist / nail tech brief (0G). Photos live only in this tab's memory:
// never saved to IndexedDB, never written on the server. Memory keeps only text (the style, the brief, her pick).
import { useEffect, useState } from "react";
import { AiChip } from "@/components/AiChip";
import { VoiceTitle } from "@/components/VoiceTitle";
import { CHECKBACK_MS } from "@/config";
import { aiMeta, chatLines, decisionSummaries, isDemoLimit, postAi } from "@/lib/api";
import { checkbackJob } from "@/lib/assistant";
import { useMemoryVault, type AiMeta, type Decision } from "@/lib/memory";
import type { ViewId } from "@/lib/persona";
import { useSession } from "@/lib/session";
import { photoConsent, shrink, type TryonInfo } from "@/lib/tryon-client";

type Kind = "hair" | "nails";
type Card = { loading: boolean; text?: string; ai?: AiMeta; error?: string; limit?: boolean };
const ORDER: ViewId[] = ["sane", "future", "bestie"];

export default function TryOn() {
  const vault = useMemoryVault();
  const session = useSession();
  const [info, setInfo] = useState<TryonInfo>();
  const [kind, setKind] = useState<Kind>("hair");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string }>();
  const [style, setStyle] = useState("");
  const [making, setMaking] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ image: string; mock: boolean; ms: number; backend: string; requestId: string | null }>();
  const [brief, setBrief] = useState<{ text: string; ai: AiMeta } | "loading">();
  const [briefError, setBriefError] = useState<{ msg: string; limit: boolean }>();
  const [cards, setCards] = useState<Partial<Record<ViewId, Card>>>({});
  const [picked, setPicked] = useState<ViewId | null>(null);

  useEffect(() => {
    fetch("/api/tryon").then((r) => r.json()).then(setInfo).catch(() => {});
  }, []);
  useEffect(() => () => photo && URL.revokeObjectURL(photo.url), [photo]);

  function reset(k: Kind = kind) {
    setKind(k);
    setPhoto(undefined);
    setStyle("");
    setResult(undefined);
    setBrief(undefined);
    setBriefError(undefined);
    setCards({});
    setPicked(null);
    setError(undefined);
  }

  async function onFile(f?: File) {
    if (!f) return;
    setError(undefined);
    try {
      const blob = await shrink(f);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
      setResult(undefined);
    } catch {
      setError("I couldn't read that photo. Try a JPEG or PNG?");
    }
  }

  const question = `Should I get this ${kind === "hair" ? "hair" : "nail"} look: ${style.trim()}?`;

  async function make() {
    if (!photo || !style.trim()) return;
    setMaking(true);
    setError(undefined);
    setBrief(undefined);
    setBriefError(undefined);
    setCards({});
    setPicked(null);
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("style", style.trim());
      form.set("address", session.address ?? "");
      form.set("image", photo.blob, "photo.jpg");
      const res = await fetch("/api/tryon", { method: "POST", body: form });
      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(data);
      // The brief (0G, text only) runs right away; the three voices wait for her tap.
      setBrief("loading");
      const b = await postAi("/api/brief", { profile: vault.memory.profile, kind, style: style.trim() }).catch((e: Error) => {
        setBrief(undefined);
        setBriefError({ msg: e.message, limit: isDemoLimit(e) });
        return null;
      });
      if (!b) return;
      setBrief({ text: b.text, ai: aiMeta(b) });
      const label = kind === "hair" ? "💇 Stylist brief" : "💅 Nail tech brief";
      await vault.update((m) => ({
        ...m,
        chat: [...m.chat, { role: "assistant", content: `${label}: ${style.trim()}\n${b.text}`, at: new Date().toISOString(), ai: aiMeta(b), kind: "brief" }],
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMaking(false);
    }
  }

  async function askViews() {
    setCards(Object.fromEntries(ORDER.map((v) => [v, { loading: true }])));
    const ctx = { profile: vault.memory.profile, decisions: decisionSummaries(vault.memory), history: chatLines(vault.memory, 10), question };
    await Promise.all(
      ORDER.map(async (view) => {
        try {
          const r = await postAi("/api/decide", { ...ctx, view });
          setCards((c) => ({ ...c, [view]: { loading: false, text: r.text, ai: aiMeta(r) } }));
        } catch (e) {
          setCards((c) => ({ ...c, [view]: { loading: false, error: (e as Error).message, limit: isDemoLimit(e) } }));
        }
      }),
    );
  }

  async function choose(choice: ViewId) {
    const now = new Date();
    const id = crypto.randomUUID();
    const checkInAt = new Date(+now + CHECKBACK_MS).toISOString();
    const views: Decision["views"] = {};
    for (const v of ORDER) if (cards[v]?.text && cards[v]?.ai) views[v] = { text: cards[v]!.text!, ai: cards[v]!.ai! };
    await vault.update((m) => ({
      ...m,
      decisions: [...m.decisions, { id, question, views, choice, at: now.toISOString(), checkInAt }],
      jobs: [...m.jobs, checkbackJob(id, checkInAt)],
    }));
    setPicked(choice);
  }

  const presets = info?.presets[kind] ?? [];
  const tab = (k: Kind, label: string) => (
    <button
      onClick={() => reset(k)}
      className={`min-h-11 flex-1 rounded-xl text-sm font-semibold ${kind === k ? "bg-ink text-cream" : "text-muted"}`}
      aria-pressed={kind === k}
    >
      {label}
    </button>
  );

  return (
    <div>
      <h1 className="font-serif text-3xl">Try the look</h1>
      <p className="mt-1 text-sm text-muted">See a new look on your own photo before the salon. Then ask the sane one, you at 30 and your bestie.</p>

      <div className="mt-4 flex gap-1 rounded-2xl border border-line bg-paper p-1">
        {tab("hair", "💇 Hair")}
        {tab("nails", "💅 Nails")}
      </div>

      <label className="mt-4 block cursor-pointer rounded-2xl border-2 border-dashed border-line bg-paper p-4 text-center text-sm text-muted">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt="Your photo" className="mx-auto max-h-64 rounded-xl" />
        ) : kind === "hair" ? (
          "📷 Add a selfie (face and hair visible, good light)"
        ) : (
          "📷 Add a photo of your hand, nails facing the camera"
        )}
        <input
          type="file"
          accept="image/*"
          capture={kind === "hair" ? "user" : "environment"}
          className="sr-only"
          aria-label={kind === "hair" ? "Upload a selfie" : "Upload a photo of your hand"}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => setStyle(p)}
            className={`min-h-11 rounded-full border px-4 text-sm ${style === p ? "border-ink bg-ink text-cream" : "border-line bg-paper text-ink"}`}
          >
            {p}
          </button>
        ))}
      </div>
      <input
        value={style}
        onChange={(e) => setStyle(e.target.value.slice(0, 120))}
        placeholder={kind === "hair" ? "…or describe it: “shoulder-length, soft layers”" : "…or describe it: “short almond, baby blue”"}
        className="mt-3 w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
      />

      {/* Consent before the photo leaves the phone (design.md §3.2): one short, true line, right at the button. */}
      {photo && (
        <p className="mt-3 rounded-xl border border-line bg-paper px-3 py-2 text-xs leading-relaxed text-muted">
          {info ? photoConsent(info.backend) : "Checking the photo provider before you send…"}
        </p>
      )}
      <button
        onClick={make}
        disabled={!info || !photo || !style.trim() || making}
        className="mt-3 w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-ink disabled:bg-line disabled:text-muted"
      >
        {making ? "Making your look… about 30 seconds" : "See it on me ✨"}
      </button>
      {info && <p className="mt-2 text-center text-xs text-muted">Up to {info.caps.user} try-ons per person per day.</p>}
      {making && (
        <div className="mt-4 grid grid-cols-2 gap-2" aria-live="polite">
          <div className="aspect-square animate-pulse rounded-xl bg-line" />
          <div className="grid aspect-square place-items-center rounded-xl border border-dashed border-line px-3 text-center text-xs text-muted">
            Making your AI preview… usually 15–30 seconds. Stay on this page.
          </div>
        </div>
      )}
      {error && !making && (
        <div className="mt-3 flex flex-wrap items-center gap-3" role="alert">
          <p className="text-sm text-red-700">{error}</p>
          {photo && style.trim() && (
            <button onClick={make} className="min-h-11 rounded-xl border border-ink px-4 text-sm font-semibold text-ink">
              Try again
            </button>
          )}
        </div>
      )}

      {result && photo && (
        <section className="mt-6">
          <div className="grid grid-cols-2 gap-2">
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="Before" className="w-full rounded-xl" />
              <figcaption className="mt-1 text-center text-xs text-muted">Before</figcaption>
            </figure>
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.image} alt={`AI preview: ${style}`} className="w-full rounded-xl" />
              <figcaption className="mt-1 text-center text-xs text-muted">{result.mock ? "MOCK: no image model configured" : `AI preview · ${style}`}</figcaption>
              {!result.mock && (
                <p className="mt-0.5 text-center font-mono text-[10px] text-muted">
                  {result.backend === "0g" ? "0G" : "OpenAI"} · {result.requestId ? `req ${result.requestId.slice(0, 8)}… · ` : ""}standard tier
                </p>
              )}
            </figure>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted">Not saved anywhere. Leave this page and it&apos;s gone.</p>

          <article className="mt-4 rounded-2xl border border-line bg-paper p-4">
            <h2 className="font-semibold">{kind === "hair" ? "💇 Your stylist brief" : "💅 Your nail tech brief"}</h2>
            {brief === "loading" && <p className="mt-2 animate-pulse text-sm text-muted">Writing it privately…</p>}
            {briefError &&
              (briefError.limit ? (
                <p role="status" className="mt-2 text-sm leading-relaxed text-ink">{briefError.msg}</p>
              ) : (
                <p className="mt-2 text-sm text-red-700">Could not write the brief: {briefError.msg}</p>
              ))}
            {brief && brief !== "loading" && (
              <>
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed [overflow-wrap:anywhere]">{brief.text}</p>
                <AiChip ai={brief.ai} />
              </>
            )}
          </article>

          {!Object.keys(cards).length ? (
            <button onClick={askViews} className="mt-4 w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-ink">
              Should I do it? Ask the three voices
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              {ORDER.map((v) => {
                const c = cards[v];
                return (
                  <article key={v} className="rounded-2xl border border-line bg-paper p-4">
                    <VoiceTitle view={v} as="h3" />
                    {c?.loading && <p className="mt-2 animate-pulse text-sm text-muted">…</p>}
                    {c?.error &&
                  (c.limit ? (
                    <p role="status" className="mt-2 text-sm leading-relaxed text-ink">{c.error}</p>
                  ) : (
                    <p className="mt-2 text-sm text-red-700">Could not get this view: {c.error}</p>
                  ))}
                    {c?.text && <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed [overflow-wrap:anywhere]">{c.text}</p>}
                    {c?.ai && <AiChip ai={c.ai} />}
                    {picked === v && <p className="mt-3 text-sm font-semibold text-ink">✓ Your pick</p>}
                    {c?.text && !picked && (
                      <button onClick={() => choose(v)} className="mt-3 block w-full rounded-xl bg-accent py-2 text-sm font-semibold text-ink">
                        I&apos;ll go with this
                      </button>
                    )}
                  </article>
                );
              })}
              {picked && <p className="rounded-xl bg-accent-soft p-3 text-sm">Saved. I&apos;ll ask you how the new look feels in a while 💛</p>}
            </div>
          )}
          <button onClick={() => reset()} className="mt-4 w-full text-sm text-muted underline">
            Try another look
          </button>
        </section>
      )}
    </div>
  );
}
