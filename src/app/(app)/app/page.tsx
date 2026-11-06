"use client";
// Talk: "Tell Delulu anything". Free chat with memory, sealed on 0G. No commands: the model routes requests
// (help, privacy, delete, check-ins, reminders, "help me decide") and the app performs them (src/lib/assistant.ts).
// Check-backs, reminders and check-ins appear here when they are due (in-app; no web push).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AiChip } from "@/components/AiChip";
import { PrivacyLine } from "@/components/PrivacyLine";
import { APP_NAME, DEMO_FAST } from "@/config";
import { aiMeta, chatLines, decisionSummaries, postAi } from "@/lib/api";
import { answerCheckback, applyChatResult } from "@/lib/assistant";
import { useMemoryVault, type ChatEntry, type Decision, type Memory } from "@/lib/memory";
import { VIEWS } from "@/lib/persona";
import { OUTCOMES, whenIST } from "@/lib/schedule";

const STARTERS = ["Something happened today…", "I can't decide if I should…", "What can you do?"];

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
        See perspectives →
      </Link>
    </div>
  );
}

const pill = "rounded-full border border-line bg-cream px-3 py-1 text-sm text-ink";

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
          className="rounded-full bg-red-700 px-3 py-1 text-sm font-semibold text-white"
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
    if (!rs.length) return <p className="mt-2 text-sm text-muted">No reminders right now. Just tell me, like “remind me Sunday 6pm to call Riya”.</p>;
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
            {p.ai!.teeVerified === true ? "TEE ✓" : p.ai!.teeVerified === false ? "TEE ✗" : "no TEE check"}
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

export default function Talk() {
  const vault = useMemoryVault();
  const router = useRouter();
  const m = vault.memory;
  const { chat, profile, decisions } = m;
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
    await vault.update((mm) => ({ ...mm, chat: [...mm.chat, { role: "user", content: message, at: new Date().toISOString() }] }));
    try {
      const r = await postAi("/api/chat", { profile, decisions: decisionSummaries(vault.memory), history, message });
      let effect: { navigate?: string } = {};
      await vault.update((mm) => {
        const out = applyChatResult(mm, r, aiMeta(r), Date.now(), DEMO_FAST);
        effect = out.effect;
        return out.memory;
      });
      if (effect.navigate) router.push(effect.navigate);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-serif text-3xl">Tell {APP_NAME} anything</h1>
        <Link href="/tryon" className="shrink-0 rounded-full bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent">
          ✨ Try-on
        </Link>
      </div>
      <p className="text-sm text-muted">Your AI companion, your split personality. It remembers you and shows you different perspectives.</p>
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
        {chat.map((e, i) => (
          <div key={i} className={e.role === "user" ? "flex justify-end" : ""}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${e.role === "user" ? "bg-accent text-white" : "border border-line bg-paper"}`}
            >
              <p className="whitespace-pre-wrap">{e.content}</p>
              {e.ai && <AiChip ai={e.ai} />}
              {e.decision && <DecisionCard summary={e.decision} decided={decisions.find((d) => d.question === e.decision)} />}
              <Extras e={e} i={i} m={m} />
            </div>
          </div>
        ))}
        {busy && <p className="animate-pulse text-sm text-muted">{APP_NAME} is thinking privately…</p>}
        {error && <p className="text-sm text-red-700">Not sent to the model: {error}</p>}
        {/* spacer so the last bubble clears the fixed input + nav */}
        <div ref={end} className="h-20" />
      </div>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          send();
        }}
        className="fixed inset-x-0 bottom-12 mx-auto flex max-w-md gap-2 bg-cream px-4 py-2"
      >
        <input
          value={text}
          onChange={(ev) => setText(ev.target.value)}
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
