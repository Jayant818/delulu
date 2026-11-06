# Delulu

**Delulu is your AI companion, your split personality. Tell it anything; it helps you decide by showing you different perspectives.** Built for young women. **The website is the main product** (landing at `/`, the app at `/app`, mobile-first); the same brain also runs as a Telegram bot.

She tells Delulu anything, and it remembers her (what it learns about her from the chat, past chats, past decisions; no setup questions). When she is weighing a choice, Delulu pulls it out of the conversation ("Sounds like a decision: … See perspectives") and shows it from different perspectives, three voices side by side: **Delulu** (the sane one: an app called Delulu that gives the grounded answer), **Future You at 30**, and **Your Bestie**. She picks one; later Delulu asks how it went. Like a good secretary, it keeps her reminders ("remind me Sunday 6pm to call Riya") and checks in on her daily at a time she picks. And before the salon, **Try-on** shows a new hair or nail look on her own photo, then writes the brief for her stylist or nail tech.

**Privacy, in one line:** your chats run sealed on 0G (private TEE mode); try-on photos go to an image model on 0G's standard tier (not sealed) and are deleted right after. The app shows the chat line on Talk; the try-on line lives in the landing FAQ (Jayant, TG 3486: no banner on the try-on screen). Every chat answer carries its 0G request ID.

**No commands, English only.** She just talks; the model routes requests like "help me decide …", "what are my reminders", "check in on me every evening at 9", "is this private?" or "delete everything" (which asks her to confirm), and the app performs them.

**Anti-scam by design:** Delulu never asks for money, crypto, a wallet, passwords or codes, and never asks her to click a link.

The name is one constant: `src/config.ts` → `APP_NAME`. Storage keys and the signed key message do not use it, so a rename keeps existing memory readable.

Built for ETHGlobal Mumbai 2026, track **Build with 0G Private Computer**. Everything runs on 0G: chat, decisions and briefs sealed (private/TeeML tier); try-on on 0G's image model (standard tier, not sealed, and labelled as such).

## Run it

```bash
npm install
cp .env.example .env.local   # fill in ZG_API_KEY (0G): chat AND try-on; see REHEARSAL.md
npm run dev                  # landing on http://localhost:3000, the app on /app
npm run bot                  # optional: the Telegram bot (needs TELEGRAM_BOT_TOKEN)
```

Without keys everything still runs, labelled: chat answers say MOCK, try-on returns your photo unchanged with "MOCK", login uses a DEV wallet unless `NEXT_PUBLIC_PRIVY_APP_ID` is set. `NEXT_PUBLIC_DEMO_FAST=1` makes check-backs and the first daily check-in due after 1 minute (for the demo video). Stop the dev server when idle (`.next` grows).

**Try-on costs about $0.027 per image on 0G:** hard caps of 40 images per day for everyone and 5 per person per day (wallet and IP), in `src/lib/tryon.ts` (`TRYON_CAP_TOTAL`, `TRYON_CAP_USER`).

| Command | What it checks |
|---|---|
| `npm test` | 22 cases. **web**: assistant logic (intents performed by the app, reminders, in-app scheduler delivers once, daily reschedule, check-back answers become memory), memory crypto, 0G trace parsing, decision / reminder / intent parsing. **try-on**: caps (per user, per IP, total, per IST day, refunds), MOCK mode, the exact request to the image model against a fake OpenAI server (never `input_fidelity`), nothing on disk but hashed counts. **bot**: the whole Telegram flow offline, no slash commands, nothing readable on disk, scheduler. |
| `npm run check:live` | with real keys: replays the demo against 0G (chat, decisions, reminders, intents, three voices, check-in, try-on brief) and probes the image model; exits 1 unless every answer is 0G private mode with a verified TEE signature |
| `npm run build` | production build |
| `node scripts/e2e.cjs <playwright-core> <dir>` | the web app in a headless browser, 22 checks: open → chat (no setup questions) → decision card → Decide → three voices → pick → reload → in-app check-back → reminders and "delete everything" by plain text → try-on (MOCK) → brief → three voices → no photo stored → delete everything. Start the dev server with `ZG_API_KEY= NEXT_PUBLIC_CHECKBACK_MS=8000 npm run dev` for it (empty `ZG_API_KEY` keeps it on MOCK: the test checks MOCK labels and costs nothing). |

## Real vs stubbed (2026-11-06)

| Part | Status |
|---|---|
| Telegram bot (`src/bot/`), text only: Start → free chat (it learns about her as she talks), decision card, 3 voices with "Go with …" buttons, saved decision + check-back date; plain-text intents for help, privacy + proof, delete everything (with confirm), check-ins, reminders, "help me decide" | **Real**, tested offline with a fake Telegram API; startup checked against the real Bot API (401 with a fake token). **Not yet run with a real token.** |
| Bot memory | **Real.** Encrypted at rest: per-user random data key (AES-256-GCM), wrapped by `BOT_MASTER_KEY`; file names are HMACs, not Telegram IDs; "delete everything" (confirmed) deletes the record. |
| Secretary layer (T3): 30-day check-back message with "Glad / Mixed / Regret" buttons (the answer becomes memory), daily check-in at her time ("check in on me every evening at 9", an AI message with its 0G footer), reminders from chat ("what are my reminders", "cancel the Riya reminder", or the cancel button) | **Real**, tested offline (due times, no double delivery, schedule survives a restart, deleting clears it). The schedule lives inside each encrypted record; a 15 s timer delivers what is due. IST only. Reminder-time and intent routing on the real model are **untested until the key arrives** (`npm run check:live` tests both). |
| Try-on (hair + nails): `/tryon`, `/api/tryon`, `/api/brief` (0G) | **Real, on 0G, verified 2026-11-06** with synthetic test photos (no real person): `bytedance/seedream-5.0-flash` via `/v1/images/generations` with the photo as a reference image; hair edit ~17 s, nails ~14 s, $0.027 per image, face/hand kept. It is **standard tier** (0G has no TeeML image-edit model; responses carry `x-0g-e2ee: none`), so the app says try-on is not sealed. `tencent/hy-image-3.5-preview` also works (~24 s, $0.025). OpenAI (`gpt-image-2.5-sunburst`, `/v1/images/edits`) is an optional backend only if `TRYON_BACKEND=openai`; a 0G failure never falls back to OpenAI. Photo and result live only in the request and her browser tab; nothing on the server's disk except hashed per-day counts. |
| Web assistant: plain-text intents + in-app scheduler (check-backs, reminders, daily check-ins appear in Talk when due, checked on open and every 15 s) | **Real**, unit-tested and E2E-tested. No web push: she sees them when the app is open. |
| Voice | **Dropped** (Jayant, TG 3399). |
| Web screens (landing, Talk = home chat, Decide, Try-on, Settings) | **Real**, tested end to end in a browser |
| Decision detection, reminders, intents (bot and web) | **Real, verified live on `0gm-1.0`:** the demo message gave "Take the Bangalore job or stay in Jaipur"; "remind me sunday 6pm to call riya" gave Sun 8 Nov 18:00 IST; small talk gave no card; "delete everything", "check in on me every evening at 9" (21:00), "what can you do", "what are my reminders" all routed correctly. With MOCK, a keyword stand-in is used. |
| 0G inference (`src/lib/ai/provider.ts`) | **Real, verified live 2026-11-06** (`npm run check:live`, all PASS): 13 calls, every one private mode, `sealed`, with a request ID. Latency: chat 1.6-3.3 s, the three voices 5.3 s (parallel), brief 3.3 s. Cost: about $0.00005-0.0001 per call; a full live check costs under $0.001. |
| Request IDs | **Real.** Bot: a small footer on every answer (`🔒 0G · 7edd2a7a · sealed`), and the last ten when she asks "is this private?". Web: a chip on every answer (`x_0g_trace.request_id`, `tee_verified`, provider, cost). Shows `MOCK` / `FALLBACK` when not on 0G. |
| Fallback to an OpenAI-compatible endpoint | **Real**, only when `OPENAI_COMPAT_*` is set. The chip then says `FALLBACK` and the tooltip shows the 0G error. |
| Web login: email/Google + embedded EVM wallet, no seed phrase (Privy) | **Real code, not yet run with an app ID.** Needs `NEXT_PUBLIC_PRIVY_APP_ID`. Without it: **DEV** wallet (local key in localStorage, labelled). |
| Web encrypted memory | **Real.** Key = HKDF-SHA256(wallet signature over a fixed message) → AES-256-GCM, not extractable. IndexedDB holds ciphertext only (checked in the E2E test). |
| 0G Storage for the ciphertext | **Stubbed:** local IndexedDB only. |
| iAI bonus (user spends her own 0G credits) | **Not built.** Needs 0G's Privy app ID and how an app spends a signed-in user's credits (not in the public docs). Not possible in the wallet-free Telegram flow; only the web app could do it. |
| PWA | Manifest only. No service worker / offline. |

## Privacy, honestly

- **Chats are sealed.** Every chat, decision, check-in and brief call goes to 0G Private Computer in `private` trust mode: TeeML providers only, the model runs inside an Intel TDX enclave, and 0G documents that neither 0G nor the GPU operator can read the prompt.
- **We store nothing readable.** The bot keeps each person's memory encrypted at rest (per-user key, wrapped by a server master key). The web app keeps memory encrypted on her own device. Neither logs message content.
- **Try-on photos are NOT sealed.** They are processed by an image model on 0G's network (standard tier: no enclave), then deleted: the photo and the result exist only in that request's memory and in her browser tab, never on our disk, never in her stored memory. The app says this on the try-on screen and shows the 0G request ID of each image.
- **Telegram carries the messages** (bot only). Telegram can read bot chats, like any Telegram chat. That part is outside our control, and the bot says so when she asks "is this private?".
- **What we do not claim:** whoever runs the bot server holds the master key and could decrypt the store. "Nothing readable at rest" is the claim, not "unreadable to us". We also do not claim "nobody can read your chats": our server relays each message to 0G in memory (never stored or logged), and the router reports `x-0g-e2ee: sealed` but returns no `tee_verified`, so the app says "sealed", never "TEE verified".

## 0G facts verified at the source (2026-11-06)

- **Prize requirements** ([ethglobal.com/events/mumbai/prizes](https://ethglobal.com/events/mumbai/prizes)): inference on 0G Private Computer in the main user flow, **with request IDs**; a working app a judge can try; one sentence on what breaks if 0G is removed; for the iAI bonus, a user signs in with their 0G account and their credit balance goes down. **Not wanted:** generic chat wrappers, apps where the AI call could be removed without anyone noticing. Submission needs a public GitHub repo, a demo video under 3 min, and a live demo link.
- **API** ([Router quickstart](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/quickstart)): OpenAI-compatible, `https://router-api.0g.ai/v1`, `Authorization: Bearer sk-…`. Keys come from [pc.0g.ai](https://pc.0g.ai) → Dashboard → API Keys. Keys stay server-side ([Authentication](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/authentication)).
- **Request ID** ([Chat Completions](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/features/chat-completions)): every response carries `x_0g_trace` = `request_id`, `provider` (on-chain address), `billing.total_cost` (neuron, 1e18 = 1 0G).
- **Private mode** ([Privacy](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/privacy)): header `X-0G-Provider-Trust-Mode: private` routes only to TeeML providers (model runs in a TDX enclave; 0G and the operator cannot see the prompt). It fails with 503 instead of downgrading. Claude and GPT models on the router are on the `standard` tier, which is **not** private.
- **TEE check** ([Verifiable Execution](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/features/verifiable-execution)): documented as `verify_tee: true` → `x_0g_trace.tee_verified`. **Measured 2026-11-06: the router did not return `tee_verified` for `0gm-1.0` in private mode**, but every response carried the header `x-0g-e2ee: sealed`. The app therefore shows "sealed" (from that header) and only ever shows "TEE ✓" if the router actually returns `tee_verified: true`.
- **Billing** (measured): `x_0g_trace.billing` is in USD micro (`currency: "usd"`, `total_cost_usd_micro`).
- **Models** (live `GET https://router-api.0g.ai/v1/models`, no auth): 86 models. TeeML (private-capable): `0gm-1.0-35b-a3b` (the only chat model), `whisper-large-v3`, two embedding models, and two "decision" models (`laya`, `vela-2.0-9b`). This app uses `0gm-1.0-35b-a3b` with thinking off.

## Demo script (about 2 min, the website on a phone)

Run `NEXT_PUBLIC_DEMO_FAST=1 npm run dev` so the check-back arrives 1 minute after the pick. One thread all the way through: **"take the design job in Bangalore, or stay in Jaipur near my parents?"** Cut the ~30 s image wait in editing.

| Time | Screen | Do | Say |
|---|---|---|---|
| 0:00 | Landing | Scroll the hero, tap **Open Delulu** | "Every girl I know tells an AI things she'd never say out loud. Delulu is your AI companion, your split personality: tell it anything, it helps you decide by showing you different perspectives, and every chat runs sealed on 0G." |
| 0:10 | Talk | The app opens straight into the chat | "No forms, no setup: she just talks, and it learns about her as she goes. Memory is encrypted on her phone." |
| 0:20 | Talk | Type the Bangalore message | "She can tell Delulu anything, and it notices when she's stuck on a choice." |
| 0:30 | Talk | Point at the chip `0G · req … · sealed` and the decision card | "Every answer is a sealed request on 0G Private Computer: here's its request ID." |
| 0:38 | Decide | **See perspectives** → three cards → **I'll go with this** | "Different perspectives, as three voices: Delulu, the sane one; Future You at 30; Your Bestie. Three separate sealed requests. She picks." |
| 0:55 | Talk | Wait for the check-back, tap **😊 Glad I did** | "And it follows up later, here after one minute." |
| 1:05 | Talk | Type "remind me Sunday 6pm to call Riya", then "is this private?" | "No commands, just talk: reminders, check-ins, and the proof, with every request ID." |
| 1:20 | Try-on | Hair → selfie → "Copper red, same cut" → **See it on me** (cut the ~17 s wait) | "Before the salon: see it on you, made by an image model on 0G. The photo is deleted right after." |
| 1:40 | Try-on | Show the stylist brief, then **Ask the three voices** | "Then a brief she can show her stylist, and the three voices on whether to do it." |
| 1:55 | Talk | Type "delete everything" → **Yes** | "One sentence and it's all gone. Delulu: delusional name, sane answers, sealed by 0G." |

Before recording: follow REHEARSAL.md (keys, `npm run check:live`, one warm-up chat message, one real try-on to see the timing). Every chat chip must say `0G` and `sealed`, not `MOCK`. Record a backup take.

## What breaks if 0G is removed (draft for the submission)

Without 0G, everything she tells Delulu (and every decision she weighs) is readable by whichever AI company runs the model; with 0G Private Computer, every chat reply, all three voices and every brief run sealed inside a hardware enclave, and every answer carries its 0G request ID and the router's "sealed" flag. (Try-on images run on 0G's standard tier, not sealed; the landing FAQ says so.)

The bot says it in its intro and whenever she asks "is this private?"; every bot answer has a footer that says `MOCK` or "fallback model, not sealed" when it is not on 0G. The web app shows the same line under the Talk header and the Decide button (`src/components/PrivacyLine.tsx`), with "Right now: MOCK / FALLBACK" when it applies, so no screen claims more than is true.

Honest scope: our own server (the bot process, or the web app's API routes) sees the plain text while it forwards a request to 0G, in memory only. Telegram also carries bot messages.

## Layout

```
src/config.ts               APP_NAME
src/lib/brain.ts            channel-agnostic brain: chatTurn(), viewOn(), allViews() (bot + web share it)
src/lib/ai/provider.ts      complete(): 0G → OpenAI-compatible fallback → mock (mock only if nothing is configured)
src/lib/persona.ts          profile facts (learned from chat), the three voices, system prompts (incl. safety + India helplines),
                            chat JSON contract {reply, decision} + parseChatReply()
src/lib/vault.ts            HKDF → AES-GCM seal/unseal
src/lib/session.tsx         Privy embedded wallet, or DEV wallet
src/lib/memory.tsx          unlock on login, encrypted read/write, delete everything
src/bot/bot.ts              Telegram bot (grammY), no commands: chat, decision card, 3 voices, intents (help,
                            privacy+proof, delete with confirm, check-ins, reminders, decide),
                            scheduler: check-back, daily check-in, reminders (runDue)
src/bot/store.ts            encrypted-at-rest per-user store (HMAC file names, per-user data key)
src/bot/index.ts            entry: npm run bot
src/app/api/{chat,decide,status}  web API routes (input clipped and validated, no storage)
src/app/page.tsx            landing page (static; "Open Delulu" -> /app; Telegram link from NEXT_PUBLIC_TELEGRAM_BOT)
src/app/(app)/              the web app behind the wallet gate: app/ (Talk), decide/, tryon/, settings/
src/lib/assistant.ts        web intents + in-app scheduler (pure, unit-tested)
src/lib/tryon.ts            image edit call (0G default, OpenAI optional), prompts, presets, spend caps, privacy line per backend
src/app/api/{tryon,brief,checkin}  try-on (0G image model), brief + check-in (0G chat)
brand/                      DESIGN.md, SVG logo set, favicons, contact sheet
```

## Before a public deploy

- The web chat routes (`/api/chat`, `/api/decide`, `/api/brief`, `/api/checkin`) have no auth or rate limit: anyone who can reach the server can spend the 0G credits. Verify the Privy access token in `src/app/api/_shared.ts` and add a per-user cap first. (The bot has `BOT_DAILY_LIMIT`; try-on has its caps.)
- Try-on caps key on the wallet address the browser sends and on the client IP from `x-forwarded-for`. Behind a proxy that does not set that header itself, the IP can be spoofed; the 40/day total cap still holds.
- The bot handles one update at a time (grammY long-polling default); slow 0G calls for one person delay others. Use `@grammyjs/runner` with per-chat sequentialize for real traffic.
- Privy's optional Solana / smart-wallet peers are stubbed in `next.config.ts` (EVM only).

## Pricing (planned, not built)

Delulu is free in the hackathon build: there are no payments in the code. The planned plan, for the docs only (Jayant, TG 3506): **₹99/month in India, $8-9/month abroad**. The target audience is now international (Western); the app copy stays English.

## License

License: MIT. See [LICENSE](LICENSE). Copyright (c) 2026 Jayant Yadav.
