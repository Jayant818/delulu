# Tara

A private AI that helps a young woman make her own decisions. She types a decision and gets three honest views on one screen: **Tara** (practical), **Future You at 30**, and **Your Bestie**. She picks one, and Tara checks back in 30 days. Chat remembers past chats and past decisions.

The name is one constant: `src/config.ts` → `APP_NAME`.

Built for ETHGlobal Mumbai 2026, track **Build with 0G Private Computer**.

## Run it

```bash
npm install
cp .env.example .env.local   # optional: with no keys, the app runs with a DEV wallet + MOCK model
npm run dev                  # http://localhost:3000
```

Use port **3000** (or 3001 / 5173). The Privy app ID that 0G shares for the iAI bonus only works on those ports.

| Command | What it checks |
|---|---|
| `npm test` | memory crypto (same wallet → same key, other wallet cannot decrypt, no plaintext in ciphertext), 0G `x_0g_trace` parsing, "a configured 0G key never silently becomes mock" |
| `npm run build` | production build |
| `node scripts/e2e.cjs <playwright-core> <dir>` | full flow in a headless browser: login → onboarding → 3 views → pick → reload → chat → delete everything (12 checks, screenshots) |

## Real vs stubbed (2026-11-06)

| Part | Status |
|---|---|
| Screens 1-4 (onboarding, chat, decide, settings) | **Real**, tested end to end in a browser |
| 0G inference (`src/lib/ai/provider.ts`) | **Real code, not yet run with a key.** Endpoint and error shape checked live (401 with a fake key). Needs `ZG_API_KEY`. |
| Request ID chip on every AI answer | **Real** (`x_0g_trace.request_id`, `tee_verified`, provider, cost). Shows `MOCK` / `FALLBACK` when not on 0G. |
| Fallback to an OpenAI-compatible endpoint | **Real**, only when `OPENAI_COMPAT_*` is set. The chip then says `FALLBACK` and the tooltip shows the 0G error. |
| Login: email/Google + embedded EVM wallet, no seed phrase (Privy) | **Real code, not yet run with an app ID.** Needs `NEXT_PUBLIC_PRIVY_APP_ID`. Without it: **DEV** wallet (local key in localStorage, labelled). |
| Encrypted memory | **Real.** Key = HKDF-SHA256(wallet signature over a fixed message) → AES-256-GCM, not extractable. IndexedDB holds ciphertext only (checked in the E2E test). |
| 0G Storage for the ciphertext | **Stubbed:** local IndexedDB only. |
| iAI bonus (user spends her own 0G credits) | **Not built.** Needs 0G's Privy app ID and how an app spends a signed-in user's credits (not in the public docs). |
| PWA | Manifest only. No service worker / offline. |

## 0G facts verified at the source (2026-11-06)

- **Prize requirements** ([ethglobal.com/events/mumbai/prizes](https://ethglobal.com/events/mumbai/prizes)): inference on 0G Private Computer in the main user flow, **with request IDs**; a working app a judge can try; one sentence on what breaks if 0G is removed; for the iAI bonus, a user signs in with their 0G account and their credit balance goes down. **Not wanted:** generic chat wrappers, apps where the AI call could be removed without anyone noticing. Submission needs a public GitHub repo, a demo video under 3 min, and a live demo link.
- **API** ([Router quickstart](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/quickstart)): OpenAI-compatible, `https://router-api.0g.ai/v1`, `Authorization: Bearer sk-…`. Keys come from [pc.0g.ai](https://pc.0g.ai) → Dashboard → API Keys. Keys stay server-side ([Authentication](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/authentication)).
- **Request ID** ([Chat Completions](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/features/chat-completions)): every response carries `x_0g_trace` = `request_id`, `provider` (on-chain address), `billing.total_cost` (neuron, 1e18 = 1 0G).
- **Private mode** ([Privacy](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/privacy)): header `X-0G-Provider-Trust-Mode: private` routes only to TeeML providers (model runs in a TDX enclave; 0G and the operator cannot see the prompt). It fails with 503 instead of downgrading. Claude and GPT models on the router are on the `standard` tier, which is **not** private.
- **TEE check** ([Verifiable Execution](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/features/verifiable-execution)): `verify_tee: true` adds `x_0g_trace.tee_verified`.
- **Models** (live `GET https://router-api.0g.ai/v1/models`, no auth): 86 models. TeeML (private-capable): `0gm-1.0-35b-a3b` (the only chat model), `whisper-large-v3`, two embedding models, and two "decision" models (`laya`, `vela-2.0-9b`). This app uses `0gm-1.0-35b-a3b` with thinking off.

## What breaks if 0G is removed (draft for the submission)

Without 0G, every private decision she types is readable by whichever AI company runs the model; with 0G Private Computer, Tara's three voices run sealed inside a hardware enclave, and every answer shows its 0G request ID and a verified-TEE flag.

Honest scope: the app's own Next.js server sees the decrypted context while it forwards a request (in memory, never stored). On localhost that server is her own machine.

## Layout

```
src/config.ts               APP_NAME
src/lib/ai/provider.ts      complete(): 0G → OpenAI-compatible fallback → mock (mock only if nothing is configured)
src/lib/persona.ts          onboarding questions, the three voices, system prompts (incl. safety + India helplines)
src/lib/vault.ts            HKDF → AES-GCM seal/unseal
src/lib/session.tsx         Privy embedded wallet, or DEV wallet
src/lib/memory.tsx          unlock on login, encrypted read/write, delete everything
src/app/api/{chat,decide,status}  server routes (input clipped and validated, no storage)
src/app/{onboarding,chat,settings}/page.tsx, src/app/page.tsx (Decide)
```

## Before a public deploy

- The API routes have no auth or rate limit: anyone who can reach the server can spend the 0G key. Verify the Privy access token in `src/app/api/_shared.ts` first.
- Privy's optional Solana / smart-wallet peers are stubbed in `next.config.ts` (EVM only).
