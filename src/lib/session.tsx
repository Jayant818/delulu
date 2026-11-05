"use client";
// Login + wallet. Two modes behind one hook:
// - privy: email/Google login that creates an embedded EVM wallet (no seed phrase UI). Needs NEXT_PUBLIC_PRIVY_APP_ID.
//   0G shares its own Privy app ID at the event for the iAI bonus (works on localhost:3000/3001/5173 only).
// - dev: no app ID set -> a local throwaway key in localStorage, clearly labelled DEV. Not for real users.
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { PrivyProvider, usePrivy, useSignMessage, useWallets } from "@privy-io/react-auth";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export type Session = {
  mode: "privy" | "dev";
  ready: boolean;
  authenticated: boolean; // logged in; the wallet address can arrive a moment later
  address: string | null;
  login: () => void;
  logout: () => Promise<void>;
  sign: (message: string) => Promise<string>;
};

const Ctx = createContext<Session | null>(null);
export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
}

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function SessionProvider({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) return <DevSession>{children}</DevSession>;
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "google"],
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        appearance: { theme: "light", accentColor: "#c2410c" },
      }}
    >
      <PrivySession>{children}</PrivySession>
    </PrivyProvider>
  );
}

function PrivySession({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const embedded = wallets.find((w) => w.walletClientType === "privy");
  const address = authenticated ? embedded?.address ?? null : null;

  const sign = useCallback(
    async (message: string) => {
      if (!address) throw new Error("no embedded wallet yet");
      const { signature } = await signMessage({ message }, { address, uiOptions: { showWalletUIs: false } });
      return signature;
    },
    [address, signMessage],
  );

  const value = useMemo<Session>(
    () => ({ mode: "privy", ready, authenticated, address, login, logout, sign }),
    [ready, authenticated, address, login, logout, sign],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const DEV_KEY = "tara:dev-wallet";
const devListeners = new Set<() => void>();
const devKey = {
  subscribe(cb: () => void) {
    devListeners.add(cb);
    window.addEventListener("storage", cb);
    return () => {
      devListeners.delete(cb);
      window.removeEventListener("storage", cb);
    };
  },
  get(): string | null {
    try {
      return localStorage.getItem(DEV_KEY);
    } catch {
      return null;
    }
  },
  set(v: string | null) {
    try {
      if (v) localStorage.setItem(DEV_KEY, v);
      else localStorage.removeItem(DEV_KEY);
    } catch {}
    devListeners.forEach((l) => l());
  },
};

function DevSession({ children }: { children: ReactNode }) {
  // undefined on the server (not ready yet), string | null in the browser.
  const pk = useSyncExternalStore(devKey.subscribe, devKey.get, () => undefined) as `0x${string}` | null | undefined;
  const account = useMemo(() => (pk ? privateKeyToAccount(pk) : null), [pk]);

  const value = useMemo<Session>(
    () => ({
      mode: "dev",
      ready: pk !== undefined,
      authenticated: !!account,
      address: account?.address ?? null,
      login: () => devKey.set(generatePrivateKey()),
      logout: async () => devKey.set(null),
      sign: async (message: string) => {
        if (!account) throw new Error("not logged in");
        return account.signMessage({ message });
      },
    }),
    [pk, account],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
