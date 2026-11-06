"use client";
// Home: "Tell Delulu anything". Free chat with memory; when she is weighing a choice, the reply carries a
// one-line decision and an inline card sends it to the 3-voice Decide screen.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AiChip } from "@/components/AiChip";
import { PrivacyLine } from "@/components/PrivacyLine";
import { APP_NAME } from "@/config";
import { aiMeta, chatLines, decisionSummaries, postAi } from "@/lib/api";
import { useMemoryVault, type Decision } from "@/lib/memory";
import { VIEWS } from "@/lib/persona";

const STARTERS = ["Something happened today…", "I can't decide if I should…", "I need to vent"];

function DecisionCard({ summary, decided }: { summary: string; decided?: Decision }) {
  if (decided)
    return (
      <p className="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-sm">
        Decided: went with {VIEWS[decided.choice].title}. Check back on{" "}
        {new Date(decided.checkInAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}.
      </p>
    );
  return (
    <div className="mt-2 rounded-xl border border-accent bg-accent-soft px-3 py-2 text-sm">
      <p>
        <span className="font-semibold">Sounds like a decision:</span> {summary}
      </p>
      <Link href={`/decide?q=${encodeURIComponent(summary)}`} className="mt-2 inline-block font-semibold text-accent">
        See 3 views →
      </Link>
    </div>
  );
}

export default function Talk() {
  const vault = useMemoryVault();
  const { chat, profile, decisions } = vault.memory;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [chat.length, busy]);

  async function send() {
    const message = text.trim();
    if (!message || busy || !profile) return;
    setText("");
    setError(undefined);
    setBusy(true);
    const history = chatLines(vault.memory, 20);
    await vault.update((m) => ({ ...m, chat: [...m.chat, { role: "user", content: message, at: new Date().toISOString() }] }));
    try {
      const r = await postAi("/api/chat", { profile, decisions: decisionSummaries(vault.memory), history, message });
      await vault.update((m) => ({
        ...m,
        chat: [
          ...m.chat,
          { role: "assistant", content: r.text, at: new Date().toISOString(), ai: aiMeta(r), ...(r.decision ? { decision: r.decision } : {}) },
        ],
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col">
      <h1 className="font-serif text-3xl">Tell {APP_NAME} anything</h1>
      <p className="text-sm text-muted">She remembers you, and helps you decide. Only you can read this.</p>
      <PrivacyLine compact />
      <div className="mt-4 space-y-3">
        {chat.length === 0 && (
          <div className="rounded-2xl bg-paper p-4 text-sm text-muted">
            <p>What&apos;s on your mind? Big or small, I&apos;m listening.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button key={s} onClick={() => setText(s)} className="rounded-full border border-line px-3 py-1 text-ink">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {chat.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${m.role === "user" ? "bg-accent text-white" : "border border-line bg-paper"}`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.ai && <AiChip ai={m.ai} />}
              {m.decision && <DecisionCard summary={m.decision} decided={decisions.find((d) => d.question === m.decision)} />}
            </div>
          </div>
        ))}
        {busy && <p className="animate-pulse text-sm text-muted">{APP_NAME} is thinking privately…</p>}
        {error && <p className="text-sm text-red-700">Not sent to the model: {error}</p>}
        {/* spacer so the last bubble clears the fixed input + nav */}
        <div ref={end} className="h-20" />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="fixed inset-x-0 bottom-12 mx-auto flex max-w-md gap-2 bg-cream px-4 py-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell me anything…"
          className="flex-1 rounded-2xl border border-line bg-paper px-4 py-3 outline-none focus:border-accent"
        />
        <button disabled={!text.trim() || busy} className="rounded-2xl bg-accent px-4 font-semibold text-white disabled:opacity-40">
          Send
        </button>
      </form>
    </div>
  );
}
