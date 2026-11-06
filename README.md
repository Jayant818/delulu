# Delulu

**Delulu is your AI companion, your split personality. Tell it anything; it helps you decide by showing you different perspectives.** Built for young women. **The website is the main product** (landing at `/`, the app at `/app`, mobile-first); the same brain also runs as a Telegram bot.

She tells Delulu anything, and it remembers her (setup answers, past chats, past decisions). When she is weighing a choice, Delulu pulls it out of the conversation ("Sounds like a decision: … See perspectives") and shows it from different perspectives, three voices side by side: **Delulu** (the sane one: an app called Delulu that gives the grounded answer), **Future You at 30**, and **Your Bestie**. She picks one; later Delulu asks how it went. Like a good secretary, it keeps her reminders ("remind me Sunday 6pm to call Riya") and checks in on her daily at a time she picks. And before the salon, **Try-on** shows a new hair or nail look on her own photo, then writes the brief for her stylist or nail tech.

**Privacy, in one line (shown in the app):** "Your chats are sealed on 0G. Try-on photos go to OpenAI's image model to make your look, then we delete them." Every chat answer carries its 0G request ID.

**No commands, English only.** She just talks; the model routes requests like "help me decide …", "what are my reminders", "check in on me every evening at 9", "is this private?" or "delete everything" (which asks her to confirm), and the app performs them.

**Anti-scam by design:** Delulu never asks for money, crypto, a wallet, passwords or codes, and never asks her to click a link.

The name is one constant: `src/config.ts` → `APP_NAME`. Storage keys and the signed key message do not use it, so a rename keeps existing memory readable.

Built for ETHGlobal Mumbai 2026, track **Build with 0G Private Computer** (chat and decisions are 0G; try-on is an extra feature on OpenAI's image model, labelled as such).

## Run it

```bash
npm install
cp .env.example .env.local   # fill in ZG_API_KEY (0G) and OPENAI_API_KEY (try-on); see REHEARSAL.md
npm run dev                  # landing on http://localhost:3000, the app on /app
npm run bot                  # optional: the Telegram bot (needs TELEGRAM_BOT_TOKEN)
```

Without keys everything still runs, labelled: chat answers say MOCK, try-on returns your photo unchanged with "MOCK", login uses a DEV wallet unless `NEXT_PUBLIC_PRIVY_APP_ID` is set. `NEXT_PUBLIC_DEMO_FAST=1` makes check-backs and the first daily check-in due after 1 minute (for the demo video). Stop the dev server when idle (`.next` grows).

**Try-on spends Jayant's OpenAI money:** hard caps of 40 images per day for everyone and 5 per person per day (wallet and IP), in `src/lib/tryon.ts` (`TRYON_CAP_TOTAL`, `TRYON_CAP_USER`).

| Command | What it checks |
|---|---|
| `npm test` | 22 cases. **web**: assistant logic (intents performed by the app, reminders, in-app scheduler delivers once, daily reschedule, check-back answers become memory), memory crypto, 0G trace parsing, decision / reminder / intent parsing. **try-on**: caps (per user, per IP, total, per IST day, refunds), MOCK mode, the exact request to the image model against a fake OpenAI server (never `input_fidelity`), nothing on disk but hashed counts. **bot**: the whole Telegram flow offline, no slash commands, nothing readable on disk, scheduler. |
| `npm run check:live` | with real keys: replays the demo against 0G (chat, decisions, reminders, intents, three voices, check-in, try-on brief) and probes the image model; exits 1 unless every answer is 0G private mode with a verified TEE signature |
| `npm run build` | production build |
| `node scripts/e2e.cjs <playwright-core> <dir>` | the web app in a headless browser, 22 checks: login → onboarding → chat → decision card → Decide → three voices → pick → reload → in-app check-back → reminders and "delete everything" by plain text → try-on (MOCK) → brief → three voices → no photo stored → delete everything. Start the dev server with `NEXT_PUBLIC_CHECKBACK_MS=8000` for it. |

## Real vs stubbed (2026-11-06)

| Part | Status |
|---|---|
| Telegram bot (`src/bot/`), text only: Start → 5 questions, free chat, decision card, 3 voices with "Go with …" buttons, saved decision + check-back date; plain-text intents for help, privacy + proof, delete everything (with confirm), check-ins, reminders, "help me decide" | **Real**, tested offline with a fake Telegram API; startup checked against the real Bot API (401 with a fake token). **Not yet run with a real token.** |
| Bot memory | **Real.** Encrypted at rest: per-user random data key (AES-256-GCM), wrapped by `BOT_MASTER_KEY`; file names are HMACs, not Telegram IDs; "delete everything" (confirmed) deletes the record. |
| Secretary layer (T3): 30-day check-back message with "Glad / Mixed / Regret" buttons (the answer becomes memory), daily check-in at her time ("check in on me every evening at 9", an AI message with its 0G footer), reminders from chat ("what are my reminders", "cancel the Riya reminder", or the cancel button) | **Real**, tested offline (due times, no double delivery, schedule survives a restart, deleting clears it). The schedule lives inside each encrypted record; a 15 s timer delivers what is due. IST only. Reminder-time and intent routing on the real model are **untested until the key arrives** (`npm run check:live` tests both). |
| Try-on (hair + nails): `/tryon`, `/api/tryon` (OpenAI `gpt-image-2.5-sunburst`, `/v1/images/edits`, 1024 px, quality medium, no `input_fidelity`), `/api/brief` (0G) | **Real code; runs in MOCK until `OPENAI_API_KEY` is set.** The real request is tested against a fake OpenAI server; the model and its speed/quality are **untested until the key arrives**. Photo and result live only in the request and in her browser tab; nothing is written to the server's disk except hashed per-day counts; her stored memory keeps only text. |
| Web assistant: plain-text intents + in-app scheduler (check-backs, reminders, daily check-ins appear in Talk when due, checked on open and every 15 s) | **Real**, unit-tested and E2E-tested. No web push: she sees them when the app is open. |
| Voice | **Dropped** (Jayant, TG 3399). |
| Web screens (landing, onboarding, Talk = home chat, Decide, Try-on, Settings) | **Real**, tested end to end in a browser |
| Decision detection (bot and web) | **Real code; with MOCK it uses a keyword stand-in.** With a model, the chat call runs in JSON mode and returns `{reply, decision, reminder, intent}`; a tolerant parser falls back to plain text. Quality of detection on `0gm-1.0` is **untested until the key arrives.** |
| 0G inference (`src/lib/ai/provider.ts`) | **Real code, not yet run with a key.** Endpoint and error shape checked live (401 with a fake key). Needs `ZG_API_KEY`. |
| Request IDs | **Real.** Bot: a small footer on every answer (`🔒 0G · 0852f405 · TEE ✓`), and the last ten when she asks "is this private?". Web: a chip on every answer (`x_0g_trace.request_id`, `tee_verified`, provider, cost). Shows `MOCK` / `FALLBACK` when not on 0G. |
| Fallback to an OpenAI-compatible endpoint | **Real**, only when `OPENAI_COMPAT_*` is set. The chip then says `FALLBACK` and the tooltip shows the 0G error. |
| Web login: email/Google + embedded EVM wallet, no seed phrase (Privy) | **Real code, not yet run with an app ID.** Needs `NEXT_PUBLIC_PRIVY_APP_ID`. Without it: **DEV** wallet (local key in localStorage, labelled). |
| Web encrypted memory | **Real.** Key = HKDF-SHA256(wallet signature over a fixed message) → AES-256-GCM, not extractable. IndexedDB holds ciphertext only (checked in the E2E test). |
| 0G Storage for the ciphertext | **Stubbed:** local IndexedDB only. |
| iAI bonus (user spends her own 0G credits) | **Not built.** Needs 0G's Privy app ID and how an app spends a signed-in user's credits (not in the public docs). Not possible in the wallet-free Telegram flow; only the web app could do it. |
| PWA | Manifest only. No service worker / offline. |

## Privacy, honestly

- **Chats are sealed.** Every chat, decision, check-in and brief call goes to 0G Private Computer in `private` trust mode: TeeML providers only, the model runs inside an Intel TDX enclave, and 0G documents that neither 0G nor the GPU operator can read the prompt.
- **We store nothing readable.** The bot keeps each person's memory encrypted at rest (per-user key, wrapped by a server master key). The web app keeps memory encrypted on her own device. Neither logs message content.
- **Try-on photos are NOT sealed.** They go to OpenAI's image model to make the look, then we delete them: the photo and the result exist only in that request's memory and in her browser tab, never on our disk, never in her stored memory. OpenAI's own API data policy applies to what it receives. The app says this on the try-on screen.
- **Telegram carries the messages** (bot only). Telegram can read bot chats, like any Telegram chat. That part is outside our control, and the bot says so when she asks "is this private?".
- **What we do not claim:** whoever runs the bot server holds the master key and could decrypt the store. "Nothing readable at rest" is the claim, not "unreadable to us".

## 0G facts verified at the source (2026-11-06)

- **Prize requirements** ([ethglobal.com/events/mumbai/prizes](https://ethglobal.com/events/mumbai/prizes)): inference on 0G Private Computer in the main user flow, **with request IDs**; a working app a judge can try; one sentence on what breaks if 0G is removed; for the iAI bonus, a user signs in with their 0G account and their credit balance goes down. **Not wanted:** generic chat wrappers, apps where the AI call could be removed without anyone noticing. Submission needs a public GitHub repo, a demo video under 3 min, and a live demo link.
- **API** ([Router quickstart](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/quickstart)): OpenAI-compatible, `https://router-api.0g.ai/v1`, `Authorization: Bearer sk-…`. Keys come from [pc.0g.ai](https://pc.0g.ai) → Dashboard → API Keys. Keys stay server-side ([Authentication](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/authentication)).
- **Request ID** ([Chat Completions](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/features/chat-completions)): every response carries `x_0g_trace` = `request_id`, `provider` (on-chain address), `billing.total_cost` (neuron, 1e18 = 1 0G).
- **Private mode** ([Privacy](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/privacy)): header `X-0G-Provider-Trust-Mode: private` routes only to TeeML providers (model runs in a TDX enclave; 0G and the operator cannot see the prompt). It fails with 503 instead of downgrading. Claude and GPT models on the router are on the `standard` tier, which is **not** private.
- **TEE check** ([Verifiable Execution](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/features/verifiable-execution)): `verify_tee: true` adds `x_0g_trace.tee_verified`.
- **Models** (live `GET https://router-api.0g.ai/v1/models`, no auth): 86 models. TeeML (private-capable): `0gm-1.0-35b-a3b` (the only chat model), `whisper-large-v3`, two embedding models, and two "decision" models (`laya`, `vela-2.0-9b`). This app uses `0gm-1.0-35b-a3b` with thinking off.

## Demo script (about 2 min, the website on a phone)

Run `NEXT_PUBLIC_DEMO_FAST=1 npm run dev` so the check-back arrives 1 minute after the pick. One thread all the way through: **"take the design job in Bangalore, or stay in Jaipur near my parents?"** Cut the ~30 s image wait in editing.

| Time | Screen | Do | Say |
|---|---|---|---|
| 0:00 | Landing | Scroll the hero, tap **Open Delulu** | "Every girl I know tells an AI things she'd never say out loud. Delulu is your AI companion, your split personality: tell it anything, it helps you decide by showing you different perspectives, and nobody else can read it." |
| 0:10 | Login + setup | Log in, show 2 of the 5 answers | "Five questions so it actually knows her. Memory is encrypted on her phone." |
| 0:20 | Talk | Type the Bangalore message | "She can tell Delulu anything, and it notices when she's stuck on a choice." |
| 0:30 | Talk | Point at the chip `0G · … · TEE ✓` and the decision card | "Every answer is a sealed request on 0G Private Computer: here's its request ID and TEE check." |
| 0:38 | Decide | **See perspectives** → three cards → **I'll go with this** | "Different perspectives, as three voices: Delulu, the sane one; Future You at 30; Your Bestie. Three separate sealed requests. She picks." |
| 0:55 | Talk | Wait for the check-back, tap **😊 Glad I did** | "And it follows up later, here after one minute." |
| 1:05 | Talk | Type "remind me Sunday 6pm to call Riya", then "is this private?" | "No commands, just talk: reminders, check-ins, and the proof, with every request ID." |
| 1:20 | Try-on | Hair → selfie → "Copper red, same cut" → **See it on me** (cut the wait) | "Before the salon: see it on you. This part uses OpenAI's image model, and the app says so: the photo is deleted right after." |
| 1:40 | Try-on | Show the stylist brief, then **Ask the three voices** | "Then a brief she can show her stylist, and the three voices on whether to do it." |
| 1:55 | Talk | Type "delete everything" → **Yes** | "One sentence and it's all gone. Delulu: delusional name, sane answers, sealed by 0G." |

Before recording: follow REHEARSAL.md (keys, `npm run check:live`, one warm-up chat message, one real try-on to see the timing). Every chat chip must say `0G` and `TEE ✓`, not `MOCK`. Record a backup take.

## What breaks if 0G is removed (draft for the submission)

Without 0G, everything she tells Delulu (and every decision she weighs) is readable by whichever AI company runs the model; with 0G Private Computer, every chat reply, all three voices and every brief run sealed inside a hardware enclave, and every answer carries its 0G request ID and a verified-TEE flag. (Try-on images are the one exception, and the app says so.)

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
src/app/page.tsx            landing page (static; "Open Delulu" -> /app; Telegram link from NEXT_PUBLIC_TELEGRAM_BOT)
src/app/(app)/              the web app behind the wallet gate: app/ (Talk), decide/, tryon/, onboarding/, settings/
src/lib/assistant.ts        web intents + in-app scheduler (pure, unit-tested)
src/lib/tryon.ts            image edit call, prompts, presets, spend caps
src/app/api/{tryon,brief,checkin}  try-on (OpenAI), brief + check-in (0G)
brand/                      DESIGN.md, SVG logo set, favicons, contact sheet
```

## Before a public deploy

- The web chat routes (`/api/chat`, `/api/decide`, `/api/brief`, `/api/checkin`) have no auth or rate limit: anyone who can reach the server can spend the 0G credits. Verify the Privy access token in `src/app/api/_shared.ts` and add a per-user cap first. (The bot has `BOT_DAILY_LIMIT`; try-on has its caps.)
- Try-on caps key on the wallet address the browser sends and on the client IP from `x-forwarded-for`. Behind a proxy that does not set that header itself, the IP can be spoofed; the 40/day total cap still holds.
- The bot handles one update at a time (grammY long-polling default); slow 0G calls for one person delay others. Use `@grammyjs/runner` with per-chat sequentialize for real traffic.
- Privy's optional Solana / smart-wallet peers are stubbed in `next.config.ts` (EVM only).
