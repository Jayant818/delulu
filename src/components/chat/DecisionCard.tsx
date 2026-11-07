"use client";
import { useEffect, useRef, useState } from "react";
import { AiChip } from "@/components/AiChip";
import { VoiceTitle } from "@/components/VoiceTitle";
import { CHECKBACK_MS } from "@/config";
import { aiMeta, chatLines, decisionSummaries, postAi } from "@/lib/api";
import { checkbackJob } from "@/lib/assistant";
import { useMemoryVault, type AiMeta, type Decision } from "@/lib/memory";
import { VIEWS, type ViewId } from "@/lib/persona";
import { pill } from "./Bubble";

const ORDER: ViewId[] = ["sane", "future", "bestie"];
type Card = { text?: string; ai?: AiMeta; error?: string };

export function DecisionCard({ summary, decided }: { summary: string; decided?: Decision }) {
  const vault = useMemoryVault();
  const [cards, setCards] = useState<Partial<Record<ViewId, Card>>>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function ask(view?: ViewId) {
    controller.current ??= new AbortController();
    const signal = controller.current.signal;
    const ctx = { profile: vault.memory.profile, decisions: decisionSummaries(vault.memory), history: chatLines(vault.memory, 10), question: summary };
    const views = view ? [view] : ORDER;
    setCards((c) => ({ ...c, ...Object.fromEntries(views.map((v) => [v, {}])) }));
    await Promise.all(views.map(async (v) => {
      try {
        const r = await postAi("/api/decide", { ...ctx, view: v }, signal);
        if (!signal.aborted) setCards((c) => ({ ...c, [v]: { text: r.text, ai: aiMeta(r) } }));
      } catch {
        if (!signal.aborted) setCards((c) => ({ ...c, [v]: { error: "This voice couldn't answer. Try again?" } }));
      }
    }));
  }

  async function choose(choice: ViewId) {
    if (saving) return;
    setSaving(true);
    setError(undefined);
    const views: Decision["views"] = {};
    for (const v of ORDER) if (cards?.[v]?.text && cards[v]?.ai) views[v] = { text: cards[v]!.text!, ai: cards[v]!.ai! };
    const now = new Date();
    const id = crypto.randomUUID();
    const checkInAt = new Date(+now + CHECKBACK_MS).toISOString();
    try {
      await vault.update((m) => ({ ...m, decisions: [...m.decisions, { id, question: summary, views, choice, at: now.toISOString(), checkInAt }], jobs: [...m.jobs, checkbackJob(id, checkInAt)] }));
    } catch {
      setError("Couldn't save your choice on this device. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (decided) return <p className="mt-2 border-t border-line pt-2 text-sm">Decided: went with {VIEWS[decided.choice].title}. Check back on {new Date(decided.checkInAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}.</p>;
  return (
    <section aria-label="Three perspectives" className="mt-2 border-t border-line pt-2">
      <p className="text-sm"><span className="font-semibold">Sounds like a decision:</span> {summary}</p>
      {!cards ? <button onClick={() => ask()} className={`${pill} mt-2 bg-accent font-semibold`}>Hear all three</button> : (
        <div className="mt-3 divide-y divide-line">
          {ORDER.map((v) => (
            <article key={v} className="space-y-2 py-3">
              <VoiceTitle view={v} as="h3" />
              {!cards[v]?.text && !cards[v]?.error && <p role="status" className="animate-pulse text-sm text-muted">Thinking…</p>}
              {cards[v]?.error && <><p>{cards[v]?.error}</p><button className={pill} onClick={() => ask(v)}>Try again</button></>}
              {cards[v]?.text && <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{cards[v]?.text}</p>}
              {cards[v]?.ai && <AiChip ai={cards[v]!.ai!} />}
              {cards[v]?.text && <button disabled={saving} onClick={() => choose(v)} className="block min-h-11 w-full rounded-xl bg-accent px-3 text-sm font-semibold disabled:opacity-50">I&apos;ll go with this</button>}
            </article>
          ))}
        </div>
      )}
      {error && <p role="alert" className="text-sm">{error}</p>}
    </section>
  );
}
