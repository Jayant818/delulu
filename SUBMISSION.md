# ETHGlobal Mumbai 2026: submission draft

Draft for the ETHGlobal form. **PENDING-KEY** = true only after a real 0G call runs with `ZG_API_KEY`. **PENDING-APP-ID** = true only after login runs with a real Privy app ID. Remove each tag only after you check the claim in the running app.

## Project name

Delulu

## Tagline

Delulu is the solulu. We give you the sane answer.

## Short description (≤ 100 words)

Tell her anything; she helps you decide. Delulu is a private AI companion for young women that remembers her. When she is weighing a choice in chat, Delulu pulls it out into three views on one screen: Delulu (the sane one), Future You at 30, and Your Bestie. She picks one; Delulu checks back in 30 days. Every reply runs sealed on 0G Private Computer with a visible request ID and TEE check [PENDING-KEY]. Her memory is encrypted on her device with a key from her wallet signature. Google login, no seed phrase [PENDING-APP-ID].

## Long description

Girls already tell AI the things they would never say out loud: a job in another city, a relationship, money, family pressure. Today, every one of those messages sits in plain text at an AI company.

Delulu is the app with the delulu name that gives the sane answer. **Tell her anything; she helps you decide.** Onboarding asks five questions (goals, values, who she trusts, what she fears, the big thing on her mind). After that, home is a chat: she talks about anything, and Delulu answers with her setup answers, past chats and past decisions in mind.

When she is actually stuck on a choice, Delulu notices. The reply carries a one-line summary ("Sounds like a decision: take the Bangalore job or stay in Jaipur. See 3 views?") [PENDING-KEY: detection quality on the real model]. One tap opens **Decide**, pre-filled, with three views of the same choice side by side:

- **Delulu**, the sane one: the real trade-off, the cost of each option, one next step this week.
- **Future You at 30**: her own voice looking back.
- **Your Bestie**: casual, protective, honest.

She picks the one she will follow. Delulu saves it, shows "check back on <date>" 30 days later, and the chat card changes to "Decided: went with …". This is why it is not a chat wrapper: the persona remembers her, decisions are pulled out of free talk into a structured three-voice choice with a check-back, and all of it is sealed.

Privacy is the product, not a setting:

- **Inference is sealed.** Every answer is a request to 0G Private Computer in `private` trust mode, so it goes only to TeeML providers: the model runs inside an Intel TDX enclave, and 0G documents that neither 0G nor the GPU operator can read the prompt. Each answer shows its 0G request ID and the router's TEE-signature check [PENDING-KEY].
- **Memory never leaves her device in plain text.** Her wallet signs one fixed message, the signature goes through HKDF-SHA256 to make an AES-256-GCM key, and only ciphertext is stored (IndexedDB).
- **The server keeps nothing.** API routes forward one request and store nothing. **Delete everything** wipes the device store and logs her out in one tap.

What breaks if 0G is removed: without 0G, everything she tells Delulu, and every decision she weighs, is readable by whichever AI company runs the model. The app says this on screen (under the chat header and under the Decide button), and it says "MOCK" or "FALLBACK" when the app is not on 0G private mode, so the screen never claims more than is true.

Safety: if she mentions self-harm, abuse or danger, every voice stops advising and points her to a trusted adult or a helpline (India: 112, Tele-MANAS 14416).

## How it's made

- **App:** Next.js 16 (App Router, TypeScript), Tailwind 4, mobile-first, installable (web manifest). Checked at 375 px.
- **AI:** 0G Private Computer router, `https://router-api.0g.ai/v1`, OpenAI-compatible. Model `0gm-1.0-35b-a3b`: on 2026-11-06 it is the only chat model with a TeeML (sealed) provider in the live `/v1/models` list. Every request sends `X-0G-Provider-Trust-Mode: private` (TeeML only; it fails with 503 instead of downgrading) and `verify_tee: true`. The app reads `x_0g_trace.request_id`, `provider`, `tee_verified` and `billing.total_cost` and shows them on a chip under every answer [PENDING-KEY]. Chat runs in JSON mode (`response_format: json_object`) and returns `{reply, decision}`; a tolerant parser handles fenced JSON and falls back to plain text, so a format slip never breaks chat. Decide sends three parallel requests, so each voice has its own request ID. Memory feeds both: chat gets her setup answers and past decisions; each Decide voice also gets the last 10 chat lines. The `sk-` key stays on the server.
- **One model interface** (`src/lib/ai/provider.ts`): 0G first, then an optional OpenAI-compatible fallback (labelled FALLBACK, with the 0G error kept). Mock is used only when nothing is configured, so a broken 0G key fails loudly and never turns into canned text quietly.
- **Login and wallet:** Privy embedded EVM wallet, email or Google, no seed phrase UI [PENDING-APP-ID]. A labelled local DEV wallet runs when no app ID is set.
- **Encrypted memory:** WebCrypto only. Signature (deterministic RFC 6979 ECDSA) → HKDF-SHA256 → AES-256-GCM, key not extractable, random 96-bit IV per write, ciphertext in IndexedDB. The key message and the storage keys do not depend on the app name, so a rename never locks anyone out.
- **Tests:** unit tests (same wallet gives the same key; another wallet cannot decrypt; no plaintext in the ciphertext; 0G trace parsing; a configured 0G key never falls back to mock silently; decision parsing) and a headless-browser run of the full flow, chat → decision card → Decide → pick → check-back → delete (15 checks).

## Tracks

1. **0G: Build with 0G Private Computer** ($5,000). Main track. 0G inference is the whole user flow (every chat reply, plus three sealed answers per decision), each answer shows its request ID [PENDING-KEY], a judge can try it on localhost, she has a reason to come back (the 30-day check-back), and the "what breaks if 0G is removed" line is in the UI and the README. **iAI bonus: NOT YET.** It needs 0G's Privy app ID and the way an app spends a signed-in user's own credits; neither is in the public docs.
2. **Ethereum Foundation: Best CROPS App** ($3,500). Possible second track, lead property **Private**: her data is encrypted on her device, the server stores nothing, and inference is sealed. Before submitting here, the repo needs an open-source LICENSE and a "CROPS" README section (draft below), and the demo must show the moment it matters (for example, server logs with nothing identifying). Honest gaps: login depends on Privy (wallet recovery needs Privy's service), and the app server sees the decrypted request in memory while forwarding it. EF places each project in at most one of its prizes.

Not a fit (checked against the prize page): 0G Physical AI, 0G Agents That Pay, 0G Keep Building, World ID, Uniswap, Arc, Hedera, Arkiv, Whitechain, ENS, Flash, Chainlink, EF Anon-RPC and alt mempool.

## Links (fill in; Jayant decides when the repo goes public)

- GitHub (public, required by both tracks): TODO
- Live demo: TODO. The iAI sign-in works only on localhost:3000/3001/5173, so demo that part on localhost.
- Demo video (< 3 min): TODO. The script is in README.md.
- Contracts: none.
- Team: names, Telegram, X: TODO.

## Appendix: draft CROPS section for README (only if submitting to EF)

- **C (censorship resistance):** we control the web server that forwards AI requests and holds the 0G key. If it goes away, she can still read her memory on her device, but she gets no new answers. Login depends on Privy. 0G routing depends on the 0G router.
- **O (open source):** license TBD (MIT suggested). `npm install && npm run dev` runs from the repo alone, with a DEV wallet and a MOCK model.
- **P (privacy):** our server sees each request in memory and stores nothing. 0G (private mode) and the GPU operator see only encrypted traffic, according to 0G's docs. Privy sees her login email and wallet address (its SDK talks to Privy's servers for login). We add no analytics or trackers to the client.
- **S (security):** the memory key comes from a wallet signature and never leaves WebCrypto. Data is AES-256-GCM in IndexedDB. Trust assumptions: her device, Privy's embedded wallet, and the TDX enclave attestation that the 0G router checks.
