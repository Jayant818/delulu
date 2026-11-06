"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { APP_NAME } from "@/config";
import { useMemoryVault } from "@/lib/memory";
import { ONBOARDING, type Profile } from "@/lib/persona";

export default function Onboarding() {
  const vault = useMemoryVault();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Profile>(
    vault.memory.profile ?? { goals: "", values: "", trusts: "", fears: "", bigDecision: "" },
  );
  const [saving, setSaving] = useState(false);
  const q = ONBOARDING[step];
  const last = step === ONBOARDING.length - 1;

  async function next() {
    if (!last) return setStep(step + 1);
    setSaving(true);
    await vault.update((m) => ({ ...m, profile: answers }));
    router.replace("/app");
  }

  return (
    <div className="flex min-h-[80dvh] flex-col">
      <p className="text-xs uppercase tracking-widest text-muted">
        {APP_NAME} · {step + 1} of {ONBOARDING.length}
      </p>
      <div className="mt-2 h-1 rounded bg-line">
        <div className="h-1 rounded bg-accent transition-all" style={{ width: `${((step + 1) / ONBOARDING.length) * 100}%` }} />
      </div>
      <h1 className="mt-8 font-serif text-3xl leading-tight">{q.q}</h1>
      <p className="mt-2 text-sm text-muted">{q.hint}</p>
      <textarea
        key={q.key}
        autoFocus
        rows={5}
        value={answers[q.key]}
        onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })}
        className="mt-6 w-full rounded-2xl border border-line bg-paper p-4 outline-none focus:border-accent"
      />
      <p className="mt-2 text-xs text-muted">Encrypted on this device with a key only your wallet can make.</p>
      <div className="mt-auto flex gap-3 pt-8">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="rounded-2xl border border-line px-5 py-3">
            Back
          </button>
        )}
        <button
          onClick={next}
          disabled={!answers[q.key].trim() || saving}
          className="flex-1 rounded-2xl bg-accent px-5 py-3 font-semibold text-white disabled:opacity-40"
        >
          {last ? (saving ? "Saving…" : `Meet ${APP_NAME}`) : "Next"}
        </button>
      </div>
    </div>
  );
}
