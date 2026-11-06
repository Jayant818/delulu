"use client";
// Try-on: hair (selfie) or nails (photo of her hand) -> a style -> the look via the image model (0G by default) ->
// Delulu's three voices on it (0G) -> a stylist / nail tech brief (0G). Photos live only in this tab's memory:
// never saved to IndexedDB, never written on the server. Memory keeps only text (the style, the brief, her pick).
import { useEffect, useState } from "react";
import { AiChip } from "@/components/AiChip";
import { CHECKBACK_MS } from "@/config";
import { aiMeta, chatLines, decisionSummaries, postAi } from "@/lib/api";
import { checkbackJob, PRIVACY_LINE } from "@/lib/assistant";
import { useMemoryVault, type AiMeta, type Decision } from "@/lib/memory";
import { VIEWS, type ViewId } from "@/lib/persona";
import { useSession } from "@/lib/session";

type Kind = "hair" | "nails";
type Info = { presets: Record<Kind, string[]>; caps: { total: number; user: number }; mock: boolean; backend: string; model: string; privacy: string };
type Card = { loading: boolean; text?: string; ai?: AiMeta; error?: string };
const ORDER: ViewId[] = ["sane", "future", "bestie"];

/** Shrink in the browser before upload: faster, cheaper, and less of her photo leaves the phone. */
async function shrink(file: File, max = 1024): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("could not read the photo"))), "image/jpeg", 0.9));
}

export default function TryOn() {
  const vault = useMemoryVault();
  const session = useSession();
  const { profile } = vault.memory;
  const [info, setInfo] = useState<Info>();
  const [kind, setKind] = useState<Kind>("hair");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string }>();
  const [style, setStyle] = useState("");
  const [making, setMaking] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ image: string; mock: boolean; ms: number; backend: string; requestId: string | null }>();
  const [brief, setBrief] = useState<{ text: string; ai: AiMeta } | "loading">();
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
    if (!photo || !style.trim() || !profile) return;
    setMaking(true);
    setError(undefined);
    setBrief(undefined);
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
      const b = await postAi("/api/brief", { profile, kind, style: style.trim() });
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
    if (!profile) return;
    setCards(Object.fromEntries(ORDER.map((v) => [v, { loading: true }])));
    const ctx = { profile, decisions: decisionSummaries(vault.memory), history: chatLines(vault.memory, 10), question };
    await Promise.all(
      ORDER.map(async (view) => {
        try {
          const r = await postAi("/api/decide", { ...ctx, view });
          setCards((c) => ({ ...c, [view]: { loading: false, text: r.text, ai: aiMeta(r) } }));
        } catch (e) {
          setCards((c) => ({ ...c, [view]: { loading: false, error: (e as Error).message } }));
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
      className={`flex-1 rounded-xl py-2 text-sm font-semibold ${kind === k ? "bg-ink text-cream" : "text-muted"}`}
      aria-pressed={kind === k}
    >
      {label}
    </button>
  );

  return (
    <div>
      <h1 className="font-serif text-3xl">Try the look</h1>
      <p className="mt-1 text-sm text-muted">See it on you before the salon. Then ask the three voices.</p>
      <p className="mt-2 rounded-xl border-l-4 border-ink bg-paper px-3 py-2 text-xs leading-relaxed">{info?.privacy ?? PRIVACY_LINE}</p>

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
            className={`rounded-full border px-3 py-1 text-sm ${style === p ? "border-ink bg-ink text-cream" : "border-line bg-paper text-ink"}`}
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

      <button
        onClick={make}
        disabled={!photo || !style.trim() || making}
        className="mt-3 w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-ink disabled:bg-line disabled:text-muted"
      >
        {making ? "Making your look… about 30 seconds" : "See it on me ✨"}
      </button>
      {info && <p className="mt-2 text-center text-xs text-muted">Up to {info.caps.user} try-ons per person per day.</p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

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
              <img src={result.image} alt={`After: ${style}`} className="w-full rounded-xl" />
              <figcaption className="mt-1 text-center text-xs text-muted">{result.mock ? "MOCK: no image model configured" : `After · ${style}`}</figcaption>
              {!result.mock && (
                <p className="mt-0.5 text-center font-mono text-[10px] text-muted">
                  {result.backend === "0g" ? "0G" : "OpenAI"} · {result.requestId ? `req ${result.requestId.slice(0, 8)}… · ` : ""}standard tier, not sealed
                </p>
              )}
            </figure>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted">Not saved anywhere. Leave this page and it&apos;s gone.</p>

          <article className="mt-4 rounded-2xl border border-line bg-paper p-4">
            <h2 className="font-semibold">{kind === "hair" ? "💇 Your stylist brief" : "💅 Your nail tech brief"}</h2>
            {brief === "loading" && <p className="mt-2 animate-pulse text-sm text-muted">Writing it privately…</p>}
            {brief && brief !== "loading" && (
              <>
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{brief.text}</p>
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
                    <h3 className="font-semibold">{VIEWS[v].title}</h3>
                    {c?.loading && <p className="mt-2 animate-pulse text-sm text-muted">…</p>}
                    {c?.error && <p className="mt-2 text-sm text-red-700">Could not get this view: {c.error}</p>}
                    {c?.text && <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{c.text}</p>}
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
