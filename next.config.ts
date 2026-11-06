import type { NextConfig } from "next";

// Privy imports optional peers (Solana programs, smart wallets) even when unused. We use EVM embedded
// wallets only, so these resolve to an empty stub. Install the real package if a feature needs it.
const STUB = "./src/lib/empty-module.cjs";
const OPTIONAL_PRIVY_PEERS = [
  "@solana-program/system",
  "@solana-program/memo",
  "@farcaster/mini-app-solana",
  "@abstract-foundation/agw-client",
  "permissionless",
  "permissionless/accounts",
  "permissionless/clients/pimlico",
];

// cacheComponents/partialPrefetching are off: every screen is client-rendered behind the wallet gate, so
// instant-navigation validation only produced dev-overlay errors (segments are intentionally not rendered until unlock).
const nextConfig: NextConfig = {
  // The dev "N" badge sits on top of the bottom nav (and would show in a demo recording made with `npm run dev`).
  devIndicators: false,
  turbopack: {
    resolveAlias: Object.fromEntries(OPTIONAL_PRIVY_PEERS.map((p) => [p, STUB])),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
