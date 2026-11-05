"use client";
// Login + wallet. Two modes behind one hook:
// - privy: email/Google login that creates an embedded EVM wallet (no seed phrase UI). Needs NEXT_PUBLIC_PRIVY_APP_ID.
//   0G shares its own Privy app ID at the event for the iAI bonus (works on localhost:3000/3001/5173 only).
// - dev: no app ID set -> a local throwaway key in localStorage, clearly labelled DEV. Not for real users.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

function DevSession({ children }: { children: ReactNode }) {
  const [pk, setPk] = useState<`0x${string}` | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setPk((localStorage.getItem(DEV_KEY) as `0x${string}` | null) ?? null);
    } catch {}
    setReady(true);
  }, []);

  const account = useMemo(() => (pk ? privateKeyToAccount(pk) : null), [pk]);

  const value = useMemo<Session>(
    () => ({
      mode: "dev",
      ready,
      authenticated: !!account,
      address: account?.address ?? null,
      login: () => {
        const k = generatePrivateKey();
        try {
          localStorage.setItem(DEV_KEY, k);
        } catch {}
        setPk(k);
      },
      logout: async () => {
        try {
          localStorage.removeItem(DEV_KEY);
        } catch {}
        setPk(null);
      },
      sign: async (message: string) => {
        if (!account) throw new Error("not logged in");
        return account.signMessage({ message });
      },
    }),
    [ready, account],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
