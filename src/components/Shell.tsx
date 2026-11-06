"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { APP_NAME } from "@/config";
import { useMemoryVault } from "@/lib/memory";
import { useSession } from "@/lib/session";

const NAV = [
  { href: "/app", label: "Talk" },
  { href: "/decide", label: "Decide" },
  { href: "/settings", label: "Settings" },
];

function Center({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">{children}</main>;
}

// Gate: login -> wallet -> unlock memory -> onboarding -> app.
export function Shell({ children }: { children: ReactNode }) {
  const session = useSession();
  const vault = useMemoryVault();
  const path = usePathname();
  const router = useRouter();
  const needsOnboarding = vault.status === "unlocked" && !vault.memory.profile;

  useEffect(() => {
    if (needsOnboarding && path !== "/onboarding") router.replace("/onboarding");
  }, [needsOnboarding, path, router]);

  if (!session.ready) return <Center><p className="text-muted">Loading…</p></Center>;

  if (!session.authenticated)
    return (
      <Center>
        <h1 className="font-serif text-5xl">{APP_NAME}</h1>
        <p className="text-muted">The app with the delulu name that gives you the sane answer. Three voices, your call, and only you can read it.</p>
        <button onClick={session.login} className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-white">
          {session.mode === "privy" ? "Continue with email or Google" : "Start (DEV wallet)"}
        </button>
        {session.mode === "dev" && (
          <p className="text-xs text-amber-800">DEV mode: no NEXT_PUBLIC_PRIVY_APP_ID set, so a local test wallet is used.</p>
        )}
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
  if (needsOnboarding && path !== "/onboarding") return <Center><p className="text-muted">…</p></Center>;

  const showNav = path !== "/onboarding";
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <main className="flex-1 px-4 pb-24 pt-6">{children}</main>
      {showNav && (
        <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/95 backdrop-blur">
          <div className="mx-auto flex max-w-md">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`flex-1 py-3 text-center text-sm ${path === n.href ? "font-semibold text-accent" : "text-muted"}`}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
