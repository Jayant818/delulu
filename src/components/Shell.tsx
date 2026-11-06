"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { APP_NAME } from "@/config";
import { chatLines, decisionSummaries, postAi, aiMeta } from "@/lib/api";
import { runDue } from "@/lib/assistant";
import { useMemoryVault, type Memory } from "@/lib/memory";
import { useSession } from "@/lib/session";

const NAV = [
  { href: "/app", label: "Talk" },
  { href: "/decide", label: "Decide" },
  { href: "/tryon", label: "Try-on" },
  { href: "/settings", label: "Settings" },
];

function Center({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">{children}</main>;
}

// Gate: login -> wallet -> unlock memory -> app. No setup questions (Jayant, TG 3486): it learns about her from the chat.
export function Shell({ children }: { children: ReactNode }) {
  const session = useSession();
  const vault = useMemoryVault();
  const path = usePathname();

  // DEV mode has nothing to log in to: make the device key at once, so opening the app lands in the chat.
  const autoLogin = session.mode === "dev" && session.ready && !session.authenticated;
  useEffect(() => {
    if (autoLogin) session.login();
  }, [autoLogin, session]);

  // In-app scheduler: when she opens Delulu, and every 15 s while it is open, due check-backs, reminders and
  // check-ins land in Talk. ponytail: no web push; she sees them when the app is open.
  const memRef = useRef<Memory>(vault.memory);
  const updateRef = useRef(vault.update);
  useEffect(() => {
    memRef.current = vault.memory;
    updateRef.current = vault.update;
  });
  const ready = vault.status === "unlocked";
  useEffect(() => {
    if (!ready) return;
    let running = false;
    const tick = async () => {
      const now = Date.now();
      if (running || !memRef.current.jobs.some((j) => Date.parse(j.at) <= now)) return; // nothing due: no write
      running = true;
      try {
        let checkinDue = false;
        await updateRef.current((m) => {
          const out = runDue(m, now);
          checkinDue = out.checkinDue;
          return out.memory;
        });
        if (checkinDue) {
          const m = memRef.current;
          const r = await postAi("/api/checkin", { profile: m.profile, decisions: decisionSummaries(m), history: chatLines(m, 10) }).catch(() => null);
          const content = r?.text?.trim() || "Hey you 💛 How was today, honestly?";
          await updateRef.current((mm) => ({
            ...mm,
            chat: [...mm.chat, { role: "assistant", content, at: new Date().toISOString(), kind: "checkin", ...(r ? { ai: aiMeta(r) } : {}) }],
          }));
        }
      } finally {
        running = false;
      }
    };
    tick();
    const t = setInterval(tick, 15_000);
    return () => clearInterval(t);
  }, [ready]);

  if (!session.ready || autoLogin) return <Center><p className="text-muted">Loading…</p></Center>;

  if (!session.authenticated)
    return (
      <Center>
        <h1 className="font-serif text-5xl">{APP_NAME}</h1>
        <p className="text-muted">The app with the delulu name that gives you the sane answer. Three voices, your call, and your memory stays encrypted on your phone.</p>
        <button onClick={session.login} className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-ink">
          Continue with email or Google
        </button>
      </Center>
    );

  if (!session.address) return <Center><p className="text-muted">Creating your private wallet…</p></Center>;
  if (vault.status === "unlocking" || vault.status === "locked")
    return <Center><p className="text-muted">Unlocking your memory on this device…</p></Center>;
  if (vault.status === "error")
    return (
      <Center>
        <p className="text-red-700">Could not unlock your memory: {vault.error}</p>
        <button onClick={() => session.logout()} className="rounded-xl border border-line px-4 py-2">Log out</button>
      </Center>
    );
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <main className="flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-md">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex-1 py-3 text-center text-sm ${path === n.href ? "font-semibold text-ink underline decoration-2 underline-offset-8" : "text-muted"}`}
            >
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
