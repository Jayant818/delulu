# ETHGlobal Mumbai 2026: submission draft

Draft for the ETHGlobal form. **PENDING-KEY** tags were cleared on 2026-11-06 after `npm run check:live` passed on real 0G. **PENDING-IMG** cleared 2026-11-06: try-on runs on 0G and was verified with synthetic test photos. Remove each tag only after you check the claim in the running app (REHEARSAL.md).

## Before you press submit (deadline Sat 7 Nov, 09:00 IST)

- [ ] Keys in `.env.local`, then `npm run check:live` prints "All good" (REHEARSAL.md, step 2). Only then delete the `[PENDING-…]` tags below.
- [ ] Five-minute live check passes, including one real try-on on 0G (REHEARSAL.md, step 4).
- [ ] Demo video under 3 minutes, recorded from the README script with `NEXT_PUBLIC_DEMO_FAST=1`.
- [ ] Public GitHub repo (Jayant's call; ETHGlobal and 0G both require it). The repo contains no secrets: `.env.local` and `data/` are git-ignored.
- [ ] A URL judges can open during judging (Jayant's hosting call), with the caps still on.
- [ ] Links and team details filled in (bottom of this file).

## 0G "must show" → where a judge sees it

| 0G prize requirement (verbatim) | Delulu |
|---|---|
| Inference on 0G Private Computer in your main user flow, with request IDs | Every chat reply, all three voices, every daily check-in and every stylist / nail tech brief are 0G calls in private mode. Each answer shows a chip with its request ID and the router's sealed flag; asking "is this private?" lists the last ten. Verified live 2026-11-06 (`npm run check:live`, all PASS). |
| A working app a judge can try, with a clear reason someone comes back tomorrow | Open the website on a phone: no install, no seed phrase. She comes back because Delulu follows up: the daily check-in, her reminders, and the check-back on each decision (shown when she opens the app). |
| One sentence on what breaks if 0G is removed | See "What breaks if 0G is removed" below. |
| iAI bonus: sign in with a 0G account, credit balance goes down | Not claimed: needs 0G's Privy app ID and the credit-spend flow, which are not in the public docs. |

## What breaks if 0G is removed (one sentence, for the form)

Without 0G, every secret and every decision a girl tells Delulu would be readable by whichever AI company runs the model; with 0G Private Computer each chat answer runs in private TEE mode, 0G reports it as sealed, and its request ID is on screen.

## Project name

Delulu

## Tagline

Delulu is the solulu. We give you the sane answer.

## Short description (≤ 100 words)

Delulu is your AI companion, your split personality. Tell it anything; it helps you decide by showing you different perspectives. It remembers you, catches the decisions hidden in your chats, and follows up on them. Before the salon, Try-on shows new hair or nails on your own photo and writes the brief for your stylist. Every chat runs sealed on 0G Private Computer, with a visible request ID on each answer. No commands, no wallet prompts, no links.

## Long description

Girls already tell AI the things they would never say out loud: a job in another city, a relationship, money, family pressure. Today, every one of those messages sits in plain text at an AI company.

**Delulu is your AI companion, your split personality. Tell it anything; it helps you decide by showing you different perspectives.** Delusional name, sane answers. It is a mobile-first website (and the same brain runs as a Telegram bot). No forms and no setup questions: she opens it and talks. Delulu learns lasting facts about her from the chat (goals, people, fears, plans; she can see the list in Settings) and answers with those facts, past chats and past decisions in mind. There are no commands: "help me decide …", "remind me Sunday 6pm to call Mom", "what are my reminders", "check in on me every evening at 9", "is this private?" and "delete everything" (with a confirm) all work as plain sentences.

When she is actually stuck on a choice, Delulu notices. The reply carries "Sounds like a decision: take the Chicago offer or stay in Ohio" and a **See perspectives** button. One tap shows the same choice from different perspectives, three voices side by side:

- **Delulu**, the sane one: the real trade-off, the cost of each option, one next step this week.
- **Future You at 30**: her own voice looking back.
- **Your Bestie**: casual, protective, honest.

She picks the one she will follow. Later, Delulu follows up and asks how it went (Glad / Mixed / Regret), and her answer becomes part of its memory. Reminders and a short, specific daily check-in work the same way: they appear in the app when they are due.

**Try-on (hair + nails).** She uploads a selfie or a photo of her hand, picks one of six styles or describes her own, and sees the look on herself. Then Delulu writes a ready-to-show brief for her stylist or nail tech, and shows different perspectives on whether to do it. The photo is never stored: not on our server, not in her saved memory.

This is why it is not a chat wrapper: the companion remembers her, decisions are pulled out of free talk and shown from different perspectives, Delulu follows up on its own, and every chat answer is sealed with a checkable request ID.

Privacy, honestly (chats: a line on the Talk screen; try-on: one line in the landing FAQ):

- **Chats are sealed.** Every chat, decision, check-in and brief call goes to 0G Private Computer in `private` trust mode, so only TeeML providers serve it: the model runs inside an Intel TDX enclave, and 0G documents that neither 0G nor the GPU operator can read the prompt; every response we measured carried `x-0g-e2ee: sealed`.
- **Memory stays hers.** In the web app, her memory is encrypted on her own device (a key derived from her wallet signature, AES-256-GCM); nothing readable is stored on a server.
- **Try-on is the one exception, and we say so.** The photo is processed by an image model on 0G's network, standard tier (no enclave: 0G has no sealed image-edit model today); it exists only in that request's memory and her browser tab, and is gone afterwards.

Not scammy, by design: Delulu never asks for money, crypto, a wallet, passwords or codes, and never asks her to click a link.

Safety: if she mentions self-harm, abuse or danger, every voice stops advising and points her to a trusted adult or a helpline (India: 112, Tele-MANAS 14416).

## How it's made

- **Web app:** Next.js 16 (App Router, TypeScript), Tailwind 4, mobile-first; landing at `/`, the app at `/app` (Talk, Decide, Try-on, Settings). Login via Privy embedded EVM wallet (email/Google, no seed phrase), with a labelled DEV wallet when no app ID is set.
- **AI on 0G:** 0G Private Computer router, `https://router-api.0g.ai/v1`, OpenAI-compatible. Model `0gm-1.0-35b-a3b`: on 2026-11-06 the only chat model with a TeeML (sealed) provider in the live `/v1/models` list. Every request sends `X-0G-Provider-Trust-Mode: private` (TeeML only; it fails with 503 instead of downgrading) and `verify_tee: true`; we read `x_0g_trace.request_id`, `provider`, `billing` (USD micro) and the `x-0g-e2ee` header; `tee_verified` is shown only if the router returns it (it did not for this model on 2026-11-06). Chat runs in JSON mode and returns `{reply, decision, reminder, intent}`, with the current IST time in the prompt; a tolerant parser falls back to plain text. The three voices are three parallel requests, so each has its own request ID.
- **No commands:** the model's `intent` is validated against a fixed list and the app performs the action itself (`src/lib/assistant.ts`, pure functions), so the model's words never stand in for real data.
- **Follow-ups without push:** check-backs, reminders and daily check-ins are jobs inside her encrypted memory; an in-app scheduler delivers them when she opens Delulu and every 15 s while it is open.
- **Try-on on 0G:** `bytedance/seedream-5.0-flash` via the router's `/v1/images/generations` with her photo as a reference image (1024 px): ~17 s for hair, ~14 s for nails, $0.027 per image, standard tier (not sealed; labelled). Each image shows its 0G request ID. OpenAI's image edit API is an optional backend that must be chosen explicitly; a 0G failure never falls back to it, so the photo only ever goes where the copy says. The browser shrinks the photo to 1024 px first. A hard spend cap (40 images per day in total, 5 per person per day, on wallet and IP, failed calls refunded) protects the key; only hashed per-day counts are written to disk. The brief is a 0G call (text only).
- **Encrypted memory:** WebCrypto: wallet signature (deterministic RFC 6979) → HKDF-SHA256 → AES-256-GCM, key not extractable, ciphertext in IndexedDB.
- **Same brain on Telegram:** grammY bot with the same persona, intents and scheduler; per-user records encrypted at rest.
- **Tests:** 22 unit/integration cases (assistant logic, crypto, 0G parsing, try-on caps and the exact request to the image model against a fake OpenAI server, the whole Telegram flow offline) and a 22-step headless-browser run of the website (chat → decision → three voices → check-back → plain-text intents → try-on → no photo stored → delete everything). `npm run check:live` replays the demo against the real 0G router and fails if any answer is not sealed.

## Tracks

1. **0G: Build with 0G Private Computer** ($5,000). Every model call is on 0G: chat replies, the three voices, check-ins and briefs in private (sealed) mode, try-on images on 0G's image model (standard tier, labelled). Each answer and each image carries its request ID, judges can try it in a phone browser, she has a reason to come back tomorrow, and the "what breaks if 0G is removed" line is in the app and the README. **iAI bonus: NOT CLAIMED.**

Not a fit (checked against the prize page): 0G Physical AI, 0G Agents That Pay, 0G Keep Building, Ethereum Foundation CROPS (dropped earlier), World ID, Uniswap, Arc, Hedera, Arkiv, Whitechain, ENS, Flash, Chainlink, EF Anon-RPC and alt mempool.

## Business (docs only, nothing built)

- Audience: young women abroad first (Western market); the app copy is English.
- Planned price: $8-9/month abroad, ₹99/month in India. The hackathon build is free and has no payments.

## License

MIT (LICENSE file in the repo). Copyright (c) 2026 Jayant Yadav.

## Links (fill in; Jayant decides when the repo goes public)

- GitHub (public, required): TODO
- Live demo URL: TODO (hosting is Jayant's call; the caps stay on).
- Telegram bot (optional): t.me/<bot username>: TODO, only if the bot is running.
- Demo video (< 3 min): TODO. The script is in README.md.
- Contracts: none.
- Team: names, Telegram, X: TODO.
