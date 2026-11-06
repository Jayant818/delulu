"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AiChip } from "@/components/AiChip";
import { PrivacyLine } from "@/components/PrivacyLine";
import { CHECKBACK_MS } from "@/config";
import { aiMeta, chatLines, decisionSummaries, postAi } from "@/lib/api";
import { checkbackJob } from "@/lib/assistant";
import { useMemoryVault, type AiMeta, type Decision } from "@/lib/memory";
import { VIEWS, type ViewId } from "@/lib/persona";

const ORDER: ViewId[] = ["sane", "future", "bestie"];
// "6 Nov 2026" style: unambiguous in every locale (11/6 vs 6/11).
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
type Card = { loading: boolean; text?: string; ai?: AiMeta; error?: string };

// /decide?q=<one-line decision> comes from the chat's "Sounds like a decision" card.
export default function DecidePage() {
  return (
    <Suspense>
      <FromUrl />
    </Suspense>
  );
}

function FromUrl() {
  const q = useSearchParams().get("q")?.slice(0, 300) ?? "";
  return <Decide key={q} fromChat={q} />; // key: a new card remounts with its own question
}

function Decide({ fromChat }: { fromChat: string }) {
  const vault = useMemoryVault();
  const { profile, decisions } = vault.memory;
  const [question, setQuestion] = useState(fromChat || (decisions.length ? "" : profile?.bigDecision ?? ""));
  const [asked, setAsked] = useState("");
  const [cards, setCards] = useState<Partial<Record<ViewId, Card>>>({});
  const [picked, setPicked] = useState<ViewId | null>(null);
  const busy = ORDER.some((v) => cards[v]?.loading);

  async function askAll() {
    const q = question.trim();
    if (!q || !profile) return;
    setAsked(q);
    setPicked(null);
    setCards(Object.fromEntries(ORDER.map((v) => [v, { loading: true }])));
    const ctx = { profile, decisions: decisionSummaries(vault.memory), history: chatLines(vault.memory, 10), question: q };
    // Three parallel 0G calls: three request IDs, one per voice.
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
    const views: Decision["views"] = {};
    for (const v of ORDER) {
      const c = cards[v];
      if (c?.text && c.ai) views[v] = { text: c.text, ai: c.ai };
    }
    const id = crypto.randomUUID();
    const checkInAt = new Date(+now + CHECKBACK_MS).toISOString();
    await vault.update((m) => ({
      ...m,
      decisions: [...m.decisions, { id, question: asked, views, choice, at: now.toISOString(), checkInAt }],
      jobs: [...m.jobs, checkbackJob(id, checkInAt)], // shows up in Talk when due (in-app)
    }));
    setPicked(choice);
    setQuestion("");
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">What are you deciding?</h1>
      {fromChat && <p className="mt-1 text-xs text-muted">Pulled from your chat. Edit it if it is not quite right.</p>}
      <textarea
        rows={3}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Should I take the job in Bangalore or stay near home?"
        className="mt-4 w-full rounded-2xl border border-line bg-paper p-4 outline-none focus:border-accent"
      />
      <button
        onClick={askAll}
        disabled={!question.trim() || busy}
        className="mt-3 w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-white disabled:opacity-40"
      >
        {busy ? "Thinking privately…" : "Hear all three"}
      </button>
      <PrivacyLine />

      {asked && (
        <section className="mt-6 space-y-3">
          {ORDER.map((v) => {
            const c = cards[v];
            return (
              <article key={v} className="rounded-2xl border border-line bg-paper p-4">
                <h2 className="font-semibold">{VIEWS[v].title}</h2>
                {c?.loading && <p className="mt-2 animate-pulse text-sm text-muted">…</p>}
                {c?.error && <p className="mt-2 text-sm text-red-700">Could not get this view: {c.error}</p>}
                {c?.text && <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{c.text}</p>}
                {c?.ai && <AiChip ai={c.ai} />}
                {picked === v && <p className="mt-3 text-sm font-semibold text-accent">✓ Your pick</p>}
                {c?.text && !picked && (
                  <button onClick={() => choose(v)} className="mt-3 block w-full rounded-xl border border-accent py-2 text-sm font-semibold text-accent">
                    I&apos;ll go with this
                  </button>
                )}
              </article>
            );
          })}
          {picked && <p className="rounded-xl bg-accent-soft p-3 text-sm">Saved. I&apos;ll ask you how it went, later.</p>}
        </section>
      )}

      {decisions.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-widest text-muted">Your decisions</h2>
          <ul className="mt-2 space-y-2">
            {[...decisions].reverse().map((d) => {
              const due = Date.now() >= +new Date(d.checkInAt);
              return (
                <li key={d.id} className="rounded-xl border border-line bg-paper p-3 text-sm">
                  <p className="font-medium">{d.question}</p>
                  <p className="mt-1 text-muted">
                    Went with {VIEWS[d.choice].title} · {day(d.at)}
                  </p>
                  <p className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${due ? "bg-accent text-white" : "bg-accent-soft"}`}>
                    {due ? "Time to check back: how did it go?" : `Check back on ${day(d.checkInAt)}`}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
