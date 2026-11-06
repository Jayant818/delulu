# ETHGlobal Mumbai 2026: submission draft

Draft for the ETHGlobal form. **PENDING-KEY** = true only after a real 0G call runs with `ZG_API_KEY`. **PENDING-BOT** = true only after the bot runs with the real `TELEGRAM_BOT_TOKEN`. Remove each tag only after you check the claim in the running bot.

## Before you press submit (deadline Sat 7 Nov, 09:00 IST)

- [ ] Keys in `.env.local`, then `npm run check:live` prints "All good" (REHEARSAL.md, step 2). Only then delete the `[PENDING-KEY]` / `[PENDING-BOT]` tags below.
- [ ] Five-minute live check on a phone passes (REHEARSAL.md, step 4).
- [ ] Demo video under 3 minutes, recorded from the README script with `DEMO_FAST=1`.
- [ ] Public GitHub repo (Jayant's call; ETHGlobal and 0G both require it). The repo contains no secrets: `.env.local` and `data/` are git-ignored.
- [ ] Bot running for the whole judging window, without `DEMO_FAST`.
- [ ] Links and team details filled in (bottom of this file).

## 0G "must show" → where a judge sees it

| 0G prize requirement (verbatim) | Delulu |
|---|---|
| Inference on 0G Private Computer in your main user flow, with request IDs | Every reply, all three voices and every daily check-in are 0G calls in private mode. Each message has a footer with its request ID and TEE check; `/proof` lists the last ten. [PENDING-KEY] |
| A working app a judge can try, with a clear reason someone comes back tomorrow | Open the bot in Telegram, no install, no wallet [PENDING-BOT]. She comes back because Delulu messages her first: the daily check-in, her reminders, and the 30-day check-back on each decision. |
| One sentence on what breaks if 0G is removed | See "What breaks if 0G is removed" below. |
| iAI bonus: sign in with a 0G account, credit balance goes down | Not claimed: the Telegram flow is wallet-free by design. |

## What breaks if 0G is removed (one sentence, for the form)

Without 0G, every secret and every decision a girl tells Delulu would be readable by whichever AI company runs the model; with 0G Private Computer each answer comes from a sealed hardware enclave, and its request ID proves it.

## Project name

Delulu

## Tagline

Delulu is the solulu. We give you the sane answer.

## Short description (≤ 100 words)

Tell her anything; she helps you decide. Delulu is a private AI companion for young women that lives in Telegram and remembers her. When she is weighing a choice, Delulu pulls it out of the chat and answers with three voices: Delulu (the sane one), Future You at 30, and Your Bestie. She taps one; Delulu checks back in 30 days. Every answer runs sealed on 0G Private Computer, with request IDs in /proof [PENDING-KEY]. Memory is encrypted at rest. No wallet, no payments, no links: it says so up front.

## Long description

Girls already tell AI the things they would never say out loud: a job in another city, a relationship, money, family pressure. Today, every one of those messages sits in plain text at an AI company.

Delulu is the app with the delulu name that gives the sane answer. **Tell her anything; she helps you decide.** It lives in Telegram, where she already talks [PENDING-BOT]. `/start` asks five questions (goals, values, who she trusts, what she fears, the big thing on her mind). After that she just talks, and Delulu answers with her setup answers, past chats and past decisions in mind.

When she is actually stuck on a choice, Delulu notices. The reply ends with a one-line summary, "Sounds like a decision: take the Bangalore job or stay in Jaipur", and a **See 3 views** button [PENDING-KEY: detection quality on the real model]. One tap gives three voices on the same choice:

- **Delulu**, the sane one: the real trade-off, the cost of each option, one next step this week.
- **Future You at 30**: her own voice looking back.
- **Your Bestie**: casual, protective, honest.

She taps **Go with …** on the one she will follow. Thirty days later Delulu messages her: "You went with Future You at 30. How did it go?" with Glad / Mixed / Regret buttons, and her answer becomes part of its memory.

It also works like a good secretary: "remind me Sunday 6pm to call Riya" sets a reminder (with a cancel button and `/reminders`), and `/checkin 21:00` gets her a short, specific daily check-in, written by the same sealed model. This is why it is not a chat wrapper: the persona remembers her, decisions are pulled out of free talk into a structured three-voice choice, Delulu comes back to her on its own (check-backs, check-ins, reminders), and every model call is sealed.

**Not scammy, by design.** The first message says Delulu will never ask for money, crypto, a wallet, passwords or codes, and never asks her to click a link. There is no wallet anywhere in the Telegram flow. A test checks that no message asks for any of these.

Privacy, honestly:

- **The AI is sealed.** Every model call goes to 0G Private Computer in `private` trust mode, so only TeeML providers serve it: the model runs inside an Intel TDX enclave, and 0G documents that neither 0G nor the GPU operator can read the prompt. Every answer has a small footer with its 0G request ID and the router's TEE check, and `/proof` lists the last ten [PENDING-KEY].
- **We store nothing readable.** Each person's memory is encrypted at rest with its own key (AES-256-GCM), wrapped by a server master key. File names are HMACs, not Telegram IDs. `/forget` deletes everything for good. No message content is logged.
- **Telegram carries the messages.** Telegram can read bot chats, like any Telegram chat. `/privacy` says this plainly.

What breaks if 0G is removed: without 0G, everything she tells Delulu, and every decision she weighs, is readable by whichever AI company runs the model. Every footer says `MOCK` or "fallback model, not sealed" when an answer did not come from 0G, so the bot never claims more than is true.

Safety: if she mentions self-harm, abuse or danger, every voice stops advising and points her to a trusted adult or a helpline (India: 112, Tele-MANAS 14416).

## How it's made

- **Telegram bot:** grammY with long polling, TypeScript, run with `tsx`. Commands: `/start` (5 setup questions), `/decide`, `/reminders`, `/checkin`, `/proof`, `/privacy`, `/forget`. Decision card and the three "Go with …" choices are inline buttons. A per-person daily cap protects the team's 0G credits.
- **One brain, two channels:** `src/lib/brain.ts` (persona, memory context, decision detection, three voices) is shared by the bot and a Next.js 16 web app (chat-first home + Decide screen, on-device encrypted memory, Privy embedded wallet).
- **AI:** 0G Private Computer router, `https://router-api.0g.ai/v1`, OpenAI-compatible. Model `0gm-1.0-35b-a3b`: on 2026-11-06 it is the only chat model with a TeeML (sealed) provider in the live `/v1/models` list. Every request sends `X-0G-Provider-Trust-Mode: private` (TeeML only; it fails with 503 instead of downgrading) and `verify_tee: true`. We read `x_0g_trace.request_id`, `provider`, `tee_verified` and `billing.total_cost` [PENDING-KEY]. Chat runs in JSON mode (`response_format: json_object`) and returns `{reply, decision, reminder}`, with the current IST time in the prompt so "Sunday 6pm" resolves; a tolerant parser falls back to plain text, so a format slip never breaks chat. The three voices are three parallel requests, so each has its own request ID. The `sk-` key stays on the server.
- **One model interface** (`src/lib/ai/provider.ts`): 0G first, then an optional OpenAI-compatible fallback (labelled, with the 0G error kept). Mock is used only when nothing is configured, so a broken 0G key fails loudly and never turns into canned text quietly.
- **Landing page:** Next.js, static, at `/` (hero, how it works, the three voices, privacy in honest wording, the anti-scam promise, FAQ). Brand from a light pass of our own brand process: palette assigned to claims (a reserved colour for "sealed on 0G", a loud one for the honest limits), hand-made SVG logo set.
- **Scheduler:** check-backs, daily check-ins and reminders are jobs stored inside each encrypted record; an in-memory due index (rebuilt from the store on start) and a 15 s timer deliver them, once each.
- **Bot storage:** Node `crypto` only. Per-user random 256-bit data key, AES-256-GCM with a random 96-bit IV per write, data key wrapped by `BOT_MASTER_KEY`; atomic writes; HMAC file names; `/forget` = crypto-shredding.
- **Tests:** the whole bot flow runs offline against a fake Telegram API (onboarding → chat → decision card → three voices → pick → `/proof` → `/forget`), with checks that nothing readable reaches disk, file names do not reveal Telegram IDs, a wrong master key cannot read, and no message asks for a wallet, seed, payment or link click; the scheduler is tested for due times, single delivery, restart recovery and `/forget`. Plus web tests (crypto, 0G trace parsing, decision and reminder parsing): 13 test cases in all, and a 15-step headless-browser run of the web app. `npm run check:live` replays the demo against the real 0G router and fails if any answer is not sealed.

## Tracks

1. **0G: Build with 0G Private Computer** ($5,000). 0G inference is the whole user flow (every reply, plus three sealed answers per decision), each answer carries its request ID (footer + `/proof`) [PENDING-KEY], a judge can try it in Telegram [PENDING-BOT], she has a reason to come back tomorrow (Delulu messages her first: daily check-in, reminders, the 30-day check-back), and the "what breaks if 0G is removed" line is in the bot and the README. **iAI bonus: NOT CLAIMED.** It needs "sign in with your 0G account" (Privy + wallet), and the Telegram flow is wallet-free by design.

Not a fit (checked against the prize page): 0G Physical AI, 0G Agents That Pay, 0G Keep Building, Ethereum Foundation CROPS (dropped: Telegram can read bot chats and the server holds the master key), World ID, Uniswap, Arc, Hedera, Arkiv, Whitechain, ENS, Flash, Chainlink, EF Anon-RPC and alt mempool.

## Links (fill in; Jayant decides when the repo goes public)

- GitHub (public, required): TODO
- Live demo: the Telegram bot link, t.me/<bot username>: TODO. **The bot must be running during judging.** Landing page: `/` of the web app (set `NEXT_PUBLIC_TELEGRAM_BOT` so its button links to the bot); hosting is Jayant's call.
- Demo video (< 3 min): TODO. The script is in README.md.
- Contracts: none.
- Team: names, Telegram, X: TODO.
