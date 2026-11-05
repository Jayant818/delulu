"use client";
import { useEffect, useRef, useState } from "react";
import { AiChip } from "@/components/AiChip";
import { APP_NAME } from "@/config";
import { aiMeta, decisionSummaries, postAi } from "@/lib/api";
import { useMemoryVault } from "@/lib/memory";

export default function Chat() {
  const vault = useMemoryVault();
  const { chat, profile } = vault.memory;
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
    const history = chat.slice(-20).map(({ role, content }) => ({ role, content }));
    await vault.update((m) => ({ ...m, chat: [...m.chat, { role: "user", content: message, at: new Date().toISOString() }] }));
    try {
      const r = await postAi("/api/chat", { profile, decisions: decisionSummaries(vault.memory), history, message });
      await vault.update((m) => ({
        ...m,
        chat: [...m.chat, { role: "assistant", content: r.text, at: new Date().toISOString(), ai: aiMeta(r) }],
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col">
      <h1 className="font-serif text-3xl">{APP_NAME}</h1>
      <p className="text-sm text-muted">Remembers your chats and decisions. Only you can read them.</p>
      <div className="mt-4 space-y-3">
        {chat.length === 0 && <p className="rounded-2xl bg-paper p-4 text-sm text-muted">Tell me what is on your mind today.</p>}
        {chat.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${m.role === "user" ? "bg-accent text-white" : "border border-line bg-paper"}`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.ai && <AiChip ai={m.ai} />}
            </div>
          </div>
        ))}
        {busy && <p className="animate-pulse text-sm text-muted">{APP_NAME} is thinking privately…</p>}
        {error && <p className="text-sm text-red-700">Not sent to the model: {error}</p>}
        <div ref={end} />
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
          placeholder="Message…"
          className="flex-1 rounded-2xl border border-line bg-paper px-4 py-3 outline-none focus:border-accent"
        />
        <button disabled={!text.trim() || busy} className="rounded-2xl bg-accent px-4 font-semibold text-white disabled:opacity-40">
          Send
        </button>
      </form>
    </div>
  );
}
