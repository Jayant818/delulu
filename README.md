# Delulu

**Tell her anything; she helps you decide.** Delulu is a private AI companion for young women, and it lives where she already talks: **Telegram**. She tells Delulu anything, and Delulu remembers her (setup answers, past chats, past decisions). When she is weighing a choice, Delulu pulls it out of the conversation ("Sounds like a decision: … See 3 views 👀") and answers with three honest voices: **Delulu** (the sane one: an app called Delulu that gives the grounded answer), **Future You at 30**, and **Your Bestie**. She taps the one she will follow, and 30 days later Delulu messages her to ask how it went. Like a good secretary, it also keeps her reminders ("remind me Sunday 6pm to call Riya") and checks in on her every day at a time she picks. Every model call runs sealed on 0G Private Computer, with request IDs one question away ("is this private?").

**No commands.** It is all plain text: she just talks, and the model routes requests like "help me decide …", "what are my reminders", "check in on me every evening at 9" or "delete everything" (which asks her to confirm). Only Telegram's own Start button sends `/start`.

The repo also has a **landing page** at `/` (brand: `brand/delulu-DESIGN.md`, logo set in `brand/`) and a **web app** with the same brain (`src/lib/brain.ts`) at `/app`: chat-first, the Decide screen, and on-device encrypted memory.

**Anti-scam by design:** the bot never asks for money, crypto, a wallet, passwords or codes, and never asks her to click a link. There is no wallet anywhere in the Telegram flow. It says so in its first message.

The name is one constant: `src/config.ts` → `APP_NAME`. Storage keys and the signed key message do not use it, so a rename keeps existing memory readable.

Built for ETHGlobal Mumbai 2026, track **Build with 0G Private Computer**.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in TELEGRAM_BOT_TOKEN, BOT_MASTER_KEY, ZG_API_KEY
npm run bot                  # Telegram bot, long polling (no public URL needed)
npm run dev                  # landing page on http://localhost:3000, web app on /app
```

Without `ZG_API_KEY`, every answer is a labelled MOCK ("MOCK · no AI called"). The web app also runs with no keys at all (DEV wallet + MOCK model). Use port **3000** (or 3001 / 5173) for the web app: the Privy app ID that 0G shares for the iAI bonus only works on those ports.

**The bot must be running for judges to try it** (`npm run bot` on a machine that stays awake, or a host).

| Command | What it checks |
|---|---|
| `npm test` | **bot** (offline, fake Telegram API): onboarding → chat → decision card → 3 views → pick → "is this private?" → "delete everything" (confirm No / Yes) → any message restarts onboarding; no message contains a slash command; nothing readable on disk, file names do not reveal Telegram IDs, wrong master key cannot read; no message asks for a wallet, seed, payment or link click; scheduler: check-back, daily check-in at 21:00 IST + reschedule, reminders (set, list, cancel by name or button, deliver once, survive restart, cleared by deleting). **web/brain**: memory crypto (same wallet → same key, other wallet cannot decrypt, no plaintext), rename-safe key, 0G `x_0g_trace` parsing, a configured 0G key never silently becomes mock, chat reply / decision / reminder / intent parsing |
| `npm run build` | production build of the web app |
| `node scripts/e2e.cjs <playwright-core> <dir>` | web app in a headless browser: login → onboarding → chat → decision card → Decide → 3 views → pick → reload → delete (15 checks) |

## Real vs stubbed (2026-11-06)

| Part | Status |
|---|---|
| Telegram bot (`src/bot/`), text only: Start → 5 questions, free chat, decision card, 3 voices with "Go with …" buttons, saved decision + check-back date; plain-text intents for help, privacy + proof, delete everything (with confirm), check-ins, reminders, "help me decide" | **Real**, tested offline with a fake Telegram API; startup checked against the real Bot API (401 with a fake token). **Not yet run with a real token.** |
| Bot memory | **Real.** Encrypted at rest: per-user random data key (AES-256-GCM), wrapped by `BOT_MASTER_KEY`; file names are HMACs, not Telegram IDs; "delete everything" (confirmed) deletes the record. |
| Secretary layer (T3): 30-day check-back message with "Glad / Mixed / Regret" buttons (the answer becomes memory), daily check-in at her time ("check in on me every evening at 9", an AI message with its 0G footer), reminders from chat ("what are my reminders", "cancel the Riya reminder", or the cancel button) | **Real**, tested offline (due times, no double delivery, schedule survives a restart, deleting clears it). The schedule lives inside each encrypted record; a 15 s timer delivers what is due. IST only. Reminder-time and intent routing on the real model are **untested until the key arrives** (`npm run check:live` tests both). |
| Voice notes | **Not built** (T2). |
| Web screens (onboarding, Talk = home chat, Decide, Settings) | **Real**, tested end to end in a browser |
| Decision detection (bot and web) | **Real code; with MOCK it uses a keyword stand-in.** With a model, the chat call runs in JSON mode and returns `{reply, decision}`; a tolerant parser falls back to plain text. Quality of detection on `0gm-1.0` is **untested until the key arrives.** |
| 0G inference (`src/lib/ai/provider.ts`) | **Real code, not yet run with a key.** Endpoint and error shape checked live (401 with a fake key). Needs `ZG_API_KEY`. |
| Request IDs | **Real.** Bot: a small footer on every answer (`🔒 0G · 0852f405 · TEE ✓`), and the last ten when she asks "is this private?". Web: a chip on every answer (`x_0g_trace.request_id`, `tee_verified`, provider, cost). Shows `MOCK` / `FALLBACK` when not on 0G. |
| Fallback to an OpenAI-compatible endpoint | **Real**, only when `OPENAI_COMPAT_*` is set. The chip then says `FALLBACK` and the tooltip shows the 0G error. |
| Web login: email/Google + embedded EVM wallet, no seed phrase (Privy) | **Real code, not yet run with an app ID.** Needs `NEXT_PUBLIC_PRIVY_APP_ID`. Without it: **DEV** wallet (local key in localStorage, labelled). |
| Web encrypted memory | **Real.** Key = HKDF-SHA256(wallet signature over a fixed message) → AES-256-GCM, not extractable. IndexedDB holds ciphertext only (checked in the E2E test). |
| 0G Storage for the ciphertext | **Stubbed:** local IndexedDB only. |
| iAI bonus (user spends her own 0G credits) | **Not built.** Needs 0G's Privy app ID and how an app spends a signed-in user's credits (not in the public docs). Not possible in the wallet-free Telegram flow; only the web app could do it. |
| PWA | Manifest only. No service worker / offline. |

## Privacy, honestly

- **The AI is sealed.** Every model call goes to 0G Private Computer in `private` trust mode: TeeML providers only, the model runs inside an Intel TDX enclave, and 0G documents that neither 0G nor the GPU operator can read the prompt.
- **We store nothing readable.** The bot keeps each person's memory encrypted at rest (per-user key, wrapped by a server master key). The web app keeps memory encrypted on her own device. Neither logs message content.
- **Telegram carries the messages.** Telegram can read bot chats, like any Telegram chat. That part is outside our control, and the bot says so when she asks "is this private?".
- **What we do not claim:** whoever runs the bot server holds the master key and could decrypt the store. "Nothing readable at rest" is the claim, not "unreadable to us".

## 0G facts verified at the source (2026-11-06)

- **Prize requirements** ([ethglobal.com/events/mumbai/prizes](https://ethglobal.com/events/mumbai/prizes)): inference on 0G Private Computer in the main user flow, **with request IDs**; a working app a judge can try; one sentence on what breaks if 0G is removed; for the iAI bonus, a user signs in with their 0G account and their credit balance goes down. **Not wanted:** generic chat wrappers, apps where the AI call could be removed without anyone noticing. Submission needs a public GitHub repo, a demo video under 3 min, and a live demo link.
- **API** ([Router quickstart](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/quickstart)): OpenAI-compatible, `https://router-api.0g.ai/v1`, `Authorization: Bearer sk-…`. Keys come from [pc.0g.ai](https://pc.0g.ai) → Dashboard → API Keys. Keys stay server-side ([Authentication](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/authentication)).
- **Request ID** ([Chat Completions](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/features/chat-completions)): every response carries `x_0g_trace` = `request_id`, `provider` (on-chain address), `billing.total_cost` (neuron, 1e18 = 1 0G).
- **Private mode** ([Privacy](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/privacy)): header `X-0G-Provider-Trust-Mode: private` routes only to TeeML providers (model runs in a TDX enclave; 0G and the operator cannot see the prompt). It fails with 503 instead of downgrading. Claude and GPT models on the router are on the `standard` tier, which is **not** private.
- **TEE check** ([Verifiable Execution](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/features/verifiable-execution)): `verify_tee: true` adds `x_0g_trace.tee_verified`.
- **Models** (live `GET https://router-api.0g.ai/v1/models`, no auth): 86 models. TeeML (private-capable): `0gm-1.0-35b-a3b` (the only chat model), `whisper-large-v3`, two embedding models, and two "decision" models (`laya`, `vela-2.0-9b`). This app uses `0gm-1.0-35b-a3b` with thinking off.

## Demo script (about 95 s, Telegram)

One thread all the way through: she starts talking, and a decision comes out of it: **"take the design job in Bangalore, or stay in Jaipur near my parents?"** Start the bot with `DEMO_FAST=1 npm run bot` so the check-back (and the first daily check-in) arrive 1 minute later.

| Time | Screen | Do | Say |
|---|---|---|---|
| 0:00 | Telegram | Open the bot, tap Start | "Every girl I know tells an AI things she would never say out loud. Delulu lives in Telegram, gives the sane answer, and nobody else can read it." |
| 0:08 | Telegram | Show the intro: the 🚫 line | "First thing it says: it will never ask for money, crypto, a wallet or a link. If 'Delulu' ever does, it isn't Delulu." |
| 0:16 | Telegram | Answer 2 of the 5 questions on camera (cut the rest) | "Five questions so it actually knows her." |
| 0:24 | Telegram | Type: "ugh, parents want me home but the Bangalore offer pays 2x. should I take it or stay in Jaipur?" | "She can tell Delulu anything. It remembers her, and it notices when she is actually stuck on a choice." |
| 0:36 | Telegram | Point at the footer `🔒 0G · … · TEE ✓` and **Sounds like a decision… See 3 views 👀** | "Every answer is a sealed request on 0G Private Computer: request ID and TEE check right there. And it pulled the decision out of the chat." |
| 0:46 | Telegram | Tap **See 3 views** | "Three voices: Delulu, the sane one; Future You at 30; Your Bestie. Three separate sealed 0G requests." |
| 1:00 | Telegram | Tap **Go with Future You at 30** | "She picks. Delulu saves it and checks back on her." |
| 1:06 | Telegram | Wait ~1 min (DEMO_FAST): the check-back arrives, tap **😊 Glad I did** | "And it comes back to her. Normally after 30 days; here after one minute." |
| 1:14 | Telegram | Type "remind me in 2 minutes to call Riya" | "It is her secretary too: reminders and a daily check-in." |
| 1:20 | Telegram | Type "is this private?" | "She can ask any time: the honest answer, plus every request ID behind those answers." |
| 1:26 | Telegram | Type "delete everything", tap **Yes** | "No commands anywhere: she just says it, confirms, and it is gone. Delulu: delusional name, sane answers." |

Before recording: `ZG_API_KEY` set with trust mode Private, the bot running, one warm-up message sent (the first enclave call can be slow), and every footer says `0G` and `TEE ✓`, not `MOCK`. **Rehearse the 0:24 message with the real model** and check that it returns the decision card; reword it if not. Record a backup take.

## What breaks if 0G is removed (draft for the submission)

Without 0G, everything she tells Delulu (and every decision she weighs) is readable by whichever AI company runs the model; with 0G Private Computer, every reply and all three voices run sealed inside a hardware enclave, and every answer carries its 0G request ID and a verified-TEE flag.

The bot says it in its intro and whenever she asks "is this private?"; every bot answer has a footer that says `MOCK` or "fallback model, not sealed" when it is not on 0G. The web app shows the same line under the Talk header and the Decide button (`src/components/PrivacyLine.tsx`), with "Right now: MOCK / FALLBACK" when it applies, so no screen claims more than is true.

Honest scope: our own server (the bot process, or the web app's API routes) sees the plain text while it forwards a request to 0G, in memory only. Telegram also carries bot messages.

## Layout

```
src/config.ts               APP_NAME
src/lib/brain.ts            channel-agnostic brain: chatTurn(), viewOn(), allViews() (bot + web share it)
src/lib/ai/provider.ts      complete(): 0G → OpenAI-compatible fallback → mock (mock only if nothing is configured)
src/lib/persona.ts          onboarding questions, the three voices, system prompts (incl. safety + India helplines),
                            chat JSON contract {reply, decision} + parseChatReply()
src/lib/vault.ts            HKDF → AES-GCM seal/unseal
src/lib/session.tsx         Privy embedded wallet, or DEV wallet
src/lib/memory.tsx          unlock on login, encrypted read/write, delete everything
src/bot/bot.ts              Telegram bot (grammY), no commands: onboarding, chat, decision card, 3 voices, intents (help,
                            privacy+proof, delete with confirm, check-ins, reminders, decide),
                            scheduler: check-back, daily check-in, reminders (runDue)
src/bot/store.ts            encrypted-at-rest per-user store (HMAC file names, per-user data key)
src/bot/index.ts            entry: npm run bot
src/app/api/{chat,decide,status}  web API routes (input clipped and validated, no storage)
src/app/page.tsx            landing page (static; Telegram CTA from NEXT_PUBLIC_TELEGRAM_BOT)
src/app/(app)/              the web app behind the wallet gate: app/ (Talk), decide/, onboarding/, settings/
brand/                      DESIGN.md, SVG logo set, favicons, contact sheet
```

## Before a public deploy

- The web API routes have no auth or rate limit: anyone who can reach the server can spend the 0G key. Verify the Privy access token in `src/app/api/_shared.ts` first. (The bot has a per-person daily cap, `BOT_DAILY_LIMIT`.)
- The bot handles one update at a time (grammY long-polling default); slow 0G calls for one person delay others. Use `@grammyjs/runner` with per-chat sequentialize for real traffic.
- Privy's optional Solana / smart-wallet peers are stubbed in `next.config.ts` (EVM only).
