# Rehearsal: the moment the keys land

Everything below runs from `~/Desktop/ethglobal-mumbai-2026`. Total: about 15 minutes. Do it once before recording the demo video and once before judging. The **website** is the main demo; the Telegram bot is optional.

## 0. Put the keys in `.env.local` (1 min)

`.env.local` already holds `BOT_MASTER_KEY` and `RELAYER_*` (do not change them). Add:

```bash
ZG_API_KEY=sk-<from pc.0g.ai, Dashboard -> API Keys, trust mode = Private>     # chat, decisions, briefs
OPENAI_API_KEY=sk-<Jayant's key>                                              # try-on images (his money, capped)
# optional
NEXT_PUBLIC_PRIVY_APP_ID=<Privy app ID>        # real Google/email login; without it a labelled DEV wallet is used
TELEGRAM_BOT_TOKEN=<from @BotFather>           # only for the Telegram bot
NEXT_PUBLIC_TELEGRAM_BOT=<bot username>        # landing page's secondary "chat on Telegram" link
```

## 1. Offline sanity (30 s)

```bash
npm test          # expect: # pass 22, # fail 0
```

## 2. Live check against 0G (and the image model) (1-2 min)

```bash
npm run check:live
```

Expect every line to start with `PASS`, `0g` as the backend, `tee=true`, `PASS image model gpt-image-2.5-sunburst`, and a final "All good". Exit code 1 means something is not on 0G private mode; do not demo until it is fixed. The check does not make a try-on image (that costs money); step 4 makes exactly one.

| What you see | Meaning | Fix |
|---|---|---|
| `401 invalid_api_key` | wrong or revoked 0G key | create a new `sk-` key on pc.0g.ai |
| `402 insufficient_balance` | team credits not on this account | claim the team credits at the 0G booth. Do not deposit real money without Jayant's OK |
| `503 no_provider_for_trust_mode` | no TeeML provider free right now | wait a minute and rerun. Do NOT switch trust mode for the demo: anything but `private` is not sealed |
| `tee=null` or `tee=false` | answer came back without a verified TEE signature | rerun; if it persists, ask at the 0G booth (the chip shows it honestly either way) |
| `decision: NONE` | the model did not flag the demo message as a decision | reword the demo message to state both options plainly ("should I take X or Y?") and rerun |
| `reminder: NONE` | the model did not return a reminder time | try "remind me on Sunday at 6 pm to call Riya"; if still none, leave reminders out of the video |
| `"…" -> NONE <- expected …` (intent lines) | the model did not route a plain-text request | rerun once; if it still fails, use the exact phrasing from the live check in the demo |
| `FAIL image model … HTTP 404` | this key cannot use `gpt-image-2.5-sunburst` | set `OPENAI_IMAGE_MODEL` in `.env.local` to a model the key has (ask Jayant which) |

## 3. Start the website in demo mode (30 s)

```bash
NEXT_PUBLIC_DEMO_FAST=1 npm run dev        # http://localhost:3000
```

`NEXT_PUBLIC_DEMO_FAST=1` makes a check-back due 1 minute after the pick, and the first daily check-in 1 minute after she asks for one. Use port 3000 (0G's Privy app ID only works on localhost:3000/3001/5173).

To try it on a real phone on the same Wi-Fi: `NEXT_PUBLIC_DEMO_FAST=1 npm run dev -- -H 0.0.0.0`, then open `http://<laptop IP>:3000` on the phone (DEV wallet login; Privy only works on localhost).

## 4. Five-minute live check (a phone-sized browser window is fine)

| # | Do | Expect |
|---|---|---|
| 1 | Landing → **Open Delulu** → log in | the 5 setup questions |
| 2 | answer them | Talk: "Tell Delulu anything", the 🔒 line, no "MOCK" warning |
| 3 | "ugh my parents want me home but the bangalore offer pays 2x. should i take it or stay in jaipur?" | a reply with a chip `0G · xxxxxxxx… · TEE ✓` and "Sounds like a decision … See 3 views" |
| 4 | **See 3 views** → **Hear all three** | three cards, each with its own `0G` chip |
| 5 | **I'll go with this** on one | "Saved." Back in Talk the card says "Decided: …" |
| 6 | wait about 1 minute in Talk | "💛 Check-back … How did it go?" → tap one → a reply |
| 7 | "remind me in 2 minutes to call Riya", then "what are my reminders" | "⏰ Reminder set …", then the list with Cancel; about 2 minutes later "⏰ Reminder: call Riya" appears (keep the app open) |
| 8 | "is this private?" | the privacy text with the try-on sentence, plus the request IDs |
| 9 | Try-on → Hair → selfie → "Copper red, same cut" → **See it on me** | after ~20-40 s: before/after (no "MOCK"), then the stylist brief with a `0G` chip. **Note the time it took.** This is 1 of today's 40 images. |
| 10 | **Ask the three voices** → pick | three cards, "Saved." |
| 11 | "delete everything" → **No, keep it**, then again → **Yes** | "Okay, keeping everything", then back to the login screen |

Any chip that says `MOCK` or `FALLBACK` means that answer did not come from 0G. Stop and go back to step 2.

If the try-on is too slow for the demo: set `OPENAI_IMAGE_QUALITY=low` in `.env.local` and restart `npm run dev`.

## 5. Record the demo

Fresh browser profile (or "delete everything" → Yes), `NEXT_PUBLIC_DEMO_FAST=1 npm run dev`, follow "Demo script" in README.md. Keep a backup take. Stop the dev server afterwards: `.next` grows during long dev sessions.

## 6. During judging

- Judges need a URL. On localhost only Jayant's laptop can open it; a public deploy (and the public repo) is Jayant's call. Without `NEXT_PUBLIC_DEMO_FAST`, check-backs are 30 days out.
- Every try-on spends his money; the caps (40/day total, 5/day per person) hold during judging too.
- Keep that morning's `npm run check:live` output: it is the quickest proof that every chat answer is sealed on 0G.

## Optional: the Telegram bot

```bash
DEMO_FAST=1 npm run bot      # needs TELEGRAM_BOT_TOKEN
```

Same brain, no commands: tap Start, answer 5 questions, then just talk ("help me decide …", "remind me …", "is this private?", "delete everything"). It must be running whenever someone should be able to use it.

## If 0G is down at demo time

The code can fall back to any OpenAI-compatible endpoint (`OPENAI_COMPAT_BASE_URL`, `OPENAI_COMPAT_API_KEY`, `OPENAI_COMPAT_MODEL`). Every fallback answer is labelled "FALLBACK, not sealed". Using a paid key needs Jayant's OK first, and the 0G prize needs 0G in the main flow, so this is a last resort, not a demo mode.
